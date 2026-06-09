<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;

/**
 * Flat-file moderation — moderators from admin config, bans, warnings, boots.
 */
class MudMessengerModeration
{
    private Grav $grav;
    private string $dir;

    public function __construct(Grav $grav)
    {
        $this->grav = $grav;
        $this->dir = GRAV_ROOT . '/user/data/mud-messenger/moderation';
    }

    public function isEnabled(): bool
    {
        if ((string) MudMessengerConfig::get($this->grav, 'edition', 'lite') !== 'pro') {
            return false;
        }

        return (bool) MudMessengerConfig::get($this->grav, 'moderation_enabled', false);
    }

    /** @return array<string, mixed>|null */
    public function verifyModerator(string $username, string $modKey): ?array
    {
        if (!$this->isEnabled() || $modKey === '') {
            return null;
        }

        $username = $this->sanitizeUser($username);
        foreach ($this->moderatorRows() as $row) {
            if (!is_array($row)) {
                continue;
            }
            $name = $this->sanitizeUser((string) ($row['username'] ?? ''));
            if ($name === '' || strcasecmp($name, $username) !== 0) {
                continue;
            }
            $expected = trim((string) ($row['mod_key'] ?? ''));
            if ($expected === '' || !hash_equals($expected, $modKey)) {
                return null;
            }

            return [
                'username' => $name,
                'can_edit' => !empty($row['can_edit']),
                'can_delete' => !empty($row['can_delete']),
                'can_warn' => !empty($row['can_warn']),
                'can_boot' => !empty($row['can_boot']),
                'can_ban' => !empty($row['can_ban']),
                'can_launch_forms' => !empty($row['can_launch_forms']),
            ];
        }

        return null;
    }

    public function assertPermission(?array $mod, string $perm): void
    {
        if ($mod === null || empty($mod[$perm])) {
            throw new \InvalidArgumentException('Moderator permission denied.');
        }
    }

    public function isBanned(string $username, ?string $groupId = null): bool
    {
        $username = $this->sanitizeUser($username);
        $bans = $this->readJson($this->dir . '/bans.json');
        foreach ($bans as $ban) {
            if (!is_array($ban)) {
                continue;
            }
            if (strcasecmp((string) ($ban['username'] ?? ''), $username) !== 0) {
                continue;
            }
            if (!empty($ban['expires']) && strtotime((string) $ban['expires']) < time()) {
                continue;
            }
            $scope = (string) ($ban['group'] ?? '*');
            if ($scope === '*' || ($groupId !== null && $scope === $groupId)) {
                return true;
            }
        }

        return false;
    }

    public function isBooted(string $username, string $groupId): bool
    {
        $username = $this->sanitizeUser($username);
        $boots = $this->readJson($this->dir . '/boots.json');
        foreach ($boots as $boot) {
            if (!is_array($boot)) {
                continue;
            }
            if (strcasecmp((string) ($boot['username'] ?? ''), $username) !== 0) {
                continue;
            }
            if ((string) ($boot['group'] ?? '') !== $groupId) {
                continue;
            }
            if (!empty($boot['expires']) && strtotime((string) $boot['expires']) < time()) {
                continue;
            }
            return true;
        }

        return false;
    }

    /** @return array<string, mixed> */
    public function session(string $username, string $modKey): array
    {
        $username = $this->sanitizeUser($username);
        $mod = $this->verifyModerator($username, $modKey);

        return [
            'ok' => true,
            'username' => $username,
            'isModerator' => $mod !== null,
            'permissions' => $mod ?? [],
            'banned' => $this->isBanned($username),
        ];
    }

    /** @return array<string, mixed> */
    public function warnUser(?array $mod, string $target, string $reason, string $groupId, string $by): array
    {
        $this->assertPermission($mod, 'can_warn');
        $target = $this->sanitizeUser($target);
        $reason = trim($reason);
        if ($reason === '') {
            throw new \InvalidArgumentException('Warning reason required.');
        }

        $file = $this->dir . '/warnings/' . $this->userFile($target) . '.json';
        $this->ensureDir(dirname($file));
        $rows = $this->readJson($file);
        $entry = [
            'id' => 'warn_' . bin2hex(random_bytes(6)),
            'username' => $target,
            'reason' => $reason,
            'group' => $groupId,
            'by' => $by,
            'ts' => gmdate('c'),
        ];
        $rows[] = $entry;
        $this->writeJson($file, $rows);

        return ['ok' => true, 'warning' => $entry];
    }

    /** @return array<string, mixed> */
    public function bootUser(?array $mod, string $target, string $groupId, string $by, int $minutes = 60): array
    {
        $this->assertPermission($mod, 'can_boot');
        $target = $this->sanitizeUser($target);
        $minutes = max(5, min(10080, $minutes));
        $boots = $this->readJson($this->dir . '/boots.json');
        $entry = [
            'username' => $target,
            'group' => $groupId,
            'by' => $by,
            'expires' => gmdate('c', time() + ($minutes * 60)),
            'ts' => gmdate('c'),
        ];
        $boots[] = $entry;
        $this->writeJson($this->dir . '/boots.json', $this->pruneExpired($boots));

        return ['ok' => true, 'boot' => $entry];
    }

    /** @return array<string, mixed> */
    public function banUser(?array $mod, string $target, string $by, ?string $groupId = null, ?int $days = null): array
    {
        $this->assertPermission($mod, 'can_ban');
        $target = $this->sanitizeUser($target);
        $bans = $this->readJson($this->dir . '/bans.json');
        $entry = [
            'username' => $target,
            'group' => $groupId ?: '*',
            'by' => $by,
            'expires' => $days !== null && $days > 0 ? gmdate('c', time() + ($days * 86400)) : null,
            'ts' => gmdate('c'),
        ];
        $bans = array_values(array_filter($bans, static function ($ban) use ($target, $groupId): bool {
            if (!is_array($ban)) {
                return false;
            }
            if (strcasecmp((string) ($ban['username'] ?? ''), $target) !== 0) {
                return true;
            }
            $scope = (string) ($ban['group'] ?? '*');
            $newScope = $groupId ?: '*';
            return $scope !== $newScope;
        }));
        $bans[] = $entry;
        $this->writeJson($this->dir . '/bans.json', $bans);

        return ['ok' => true, 'ban' => $entry];
    }

    /** @return array<string, mixed> */
    public function unbanUser(?array $mod, string $target, ?string $groupId = null): array
    {
        $this->assertPermission($mod, 'can_ban');
        $target = $this->sanitizeUser($target);
        $scope = $groupId ?: '*';
        $bans = $this->readJson($this->dir . '/bans.json');
        $bans = array_values(array_filter($bans, static function ($ban) use ($target, $scope): bool {
            if (!is_array($ban)) {
                return false;
            }
            if (strcasecmp((string) ($ban['username'] ?? ''), $target) !== 0) {
                return true;
            }
            return (string) ($ban['group'] ?? '*') !== $scope;
        }));
        $this->writeJson($this->dir . '/bans.json', $bans);

        return ['ok' => true, 'username' => $target, 'group' => $scope];
    }

    /** @return list<array<string, mixed>> */
    private function moderatorRows(): array
    {
        $rows = MudMessengerConfig::get($this->grav, 'moderators');
        return is_array($rows) ? $rows : [];
    }

    private function sanitizeUser(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');
        if ($name === '') {
            return '';
        }
        return substr($name, 0, 32);
    }

    private function userFile(string $username): string
    {
        return preg_replace('/[^a-z0-9_-]/i', '_', strtolower($username)) ?? 'user';
    }

    /** @return list<mixed> */
    private function readJson(string $file): array
    {
        if (!is_readable($file)) {
            return [];
        }
        $data = json_decode((string) file_get_contents($file), true);
        return is_array($data) ? $data : [];
    }

    /** @param list<mixed> $data */
    private function writeJson(string $file, array $data): void
    {
        $this->ensureDir(dirname($file));
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Could not encode moderation data.');
        }
        file_put_contents($file, $json, LOCK_EX);
    }

    private function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    /** @param list<array<string, mixed>> $rows
     *  @return list<array<string, mixed>>
     */
    private function pruneExpired(array $rows): array
    {
        $now = time();
        return array_values(array_filter($rows, static function ($row) use ($now): bool {
            if (!is_array($row) || empty($row['expires'])) {
                return true;
            }
            $exp = strtotime((string) $row['expires']);
            return $exp === false || $exp >= $now;
        }));
    }
}
