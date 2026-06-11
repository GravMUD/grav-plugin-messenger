<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;
use Grav\Common\User\Interfaces\UserInterface;

/**
 * Chat display names — reserved for Grav accounts / mods; authed users get locked nicks.
 */
class MudMessengerIdentity
{
    private const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'staff', 'system', 'chief'];

    public function __construct(private readonly Grav $grav) {}

    /** @return array<string, mixed>|null */
    public function sessionForUser(?UserInterface $user): ?array
    {
        if ($user === null) {
            return null;
        }

        $author = $this->displayNameForUser($user);
        $username = trim((string) ($user->get('username') ?? ''));
        $role = $this->roleForUser($user);
        $mod = $this->moderatorPermissionsForUser($user);

        return [
            'author' => $author,
            'username' => $username,
            'role' => $role,
            'nick_locked' => true,
            'auto_mod' => $mod !== null,
            'mod_permissions' => $mod ?? [],
        ];
    }

    public function resolveAuthor(string $requested, ?UserInterface $apiUser = null): string
    {
        if ($apiUser !== null) {
            return $this->displayNameForUser($apiUser);
        }

        $author = $this->sanitizeDisplayName($requested);
        if ($this->isReservedForGuest($author)) {
            throw new \InvalidArgumentException('That display name is reserved. Pick another nick.');
        }

        return $author;
    }

    public function isReservedForGuest(string $name): bool
    {
        $name = $this->sanitizeDisplayName($name);
        if ($name === '' || strcasecmp($name, 'anon') === 0) {
            return false;
        }

        foreach ($this->reservedNames() as $reserved) {
            if (strcasecmp($name, $reserved) === 0) {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, mixed>|null */
    public function moderatorPermissionsForUser(UserInterface $user): ?array
    {
        if ($this->isApiSuper($user)) {
            return $this->fullModeratorPermissions();
        }

        $mambersMod = $this->mambersModeratorPermissions($user);
        if ($mambersMod !== null) {
            return $mambersMod;
        }

        $username = strtolower(trim((string) ($user->get('username') ?? '')));
        foreach ($this->moderatorRows() as $row) {
            if (!is_array($row)) {
                continue;
            }
            $gravUser = strtolower(trim((string) ($row['grav_user'] ?? '')));
            $modName = strtolower($this->sanitizeDisplayName((string) ($row['username'] ?? '')));
            if ($gravUser !== '' && $gravUser === $username) {
                return $this->permissionsFromRow($row);
            }
            if ($modName !== '' && $modName === strtolower($this->displayNameForUser($user))) {
                return $this->permissionsFromRow($row);
            }
        }

        return null;
    }

    public function roleForUser(UserInterface $user): string
    {
        if ($this->isApiSuper($user)) {
            return 'admin';
        }
        if ($this->moderatorPermissionsForUser($user) !== null) {
            return 'mod';
        }
        if ($this->hasApiAccess($user)) {
            return 'staff';
        }

        return 'user';
    }

    public function roleForAuthor(string $author, ?UserInterface $apiUser = null): string
    {
        if ($apiUser !== null) {
            return $this->roleForUser($apiUser);
        }

        $authorKey = strtolower($this->sanitizeDisplayName($author));
        foreach ($this->moderatorRows() as $row) {
            if (!is_array($row)) {
                continue;
            }
            $modName = strtolower($this->sanitizeDisplayName((string) ($row['username'] ?? '')));
            if ($modName !== '' && $modName === $authorKey) {
                return 'mod';
            }
        }

        foreach ($this->gravAccountUsernames() as $username) {
            if (strtolower($username) === $authorKey) {
                return 'staff';
            }
        }

        return 'guest';
    }

    public function displayNameForUser(UserInterface $user): string
    {
        $fullname = trim((string) ($user->get('fullname') ?? ''));
        if ($fullname !== '') {
            return $this->sanitizeDisplayName($fullname);
        }

        return $this->sanitizeDisplayName(trim((string) ($user->get('username') ?? '')));
    }

    /** @return list<string> */
    public function reservedNames(): array
    {
        $names = self::RESERVED;

        foreach ($this->gravAccountUsernames() as $username) {
            $names[] = $username;
        }

        foreach ($this->moderatorRows() as $row) {
            if (!is_array($row)) {
                continue;
            }
            $username = trim((string) ($row['username'] ?? ''));
            if ($username !== '') {
                $names[] = $this->sanitizeDisplayName($username);
            }
            $gravUser = trim((string) ($row['grav_user'] ?? ''));
            if ($gravUser !== '') {
                $names[] = $this->sanitizeDisplayName($gravUser);
            }
        }

        $unique = [];
        foreach ($names as $name) {
            $key = strtolower($name);
            if ($key === '' || isset($unique[$key])) {
                continue;
            }
            $unique[$key] = $name;
        }

        return array_values($unique);
    }

    /** @return array<string, mixed>|null */
    private function mambersModeratorPermissions(UserInterface $user): ?array
    {
        require_once __DIR__ . '/MudMessengerMambersBridge.php';
        if (!MudMessengerMambersBridge::identityBridgeEnabled($this->grav)
            || !MudMessengerMambersBridge::isPro($this->grav)) {
            return null;
        }

        if (!method_exists($user, 'authorize') || !$user->authorize('site.member.moderator')) {
            return null;
        }

        return [
            'username' => $this->displayNameForUser($user),
            'can_edit' => true,
            'can_delete' => true,
            'can_warn' => true,
            'can_boot' => true,
            'can_ban' => true,
            'can_launch_forms' => true,
        ];
    }

    private function isApiSuper(UserInterface $user): bool
    {
        return (bool) $user->get('access.api.super');
    }

    private function hasApiAccess(UserInterface $user): bool
    {
        return (bool) $user->get('access.api.access') || (bool) $user->get('access.api.super');
    }

    /** @return list<string> */
    private function gravAccountUsernames(): array
    {
        $locator = $this->grav['locator'];
        $accountsDir = $locator->findResource('account://', true);
        if (!$accountsDir || !is_dir($accountsDir)) {
            return [];
        }

        $names = [];
        foreach (glob($accountsDir . '/*.yaml') ?: [] as $file) {
            $base = basename((string) $file, '.yaml');
            if ($base !== '' && $base !== '.') {
                $names[] = $base;
            }
        }

        return $names;
    }

    /** @return list<array<string, mixed>> */
    private function moderatorRows(): array
    {
        $rows = MudMessengerConfig::get($this->grav, 'moderators');
        return is_array($rows) ? $rows : [];
    }

    /** @param array<string, mixed> $row
     *  @return array<string, mixed>
     */
    private function permissionsFromRow(array $row): array
    {
        return [
            'username' => $this->sanitizeDisplayName((string) ($row['username'] ?? '')),
            'can_edit' => !empty($row['can_edit']),
            'can_delete' => !empty($row['can_delete']),
            'can_warn' => !empty($row['can_warn']),
            'can_boot' => !empty($row['can_boot']),
            'can_ban' => !empty($row['can_ban']),
            'can_launch_forms' => !empty($row['can_launch_forms']),
        ];
    }

    /** @return array<string, mixed> */
    private function fullModeratorPermissions(): array
    {
        return [
            'username' => 'admin',
            'can_edit' => true,
            'can_delete' => true,
            'can_warn' => true,
            'can_boot' => true,
            'can_ban' => true,
            'can_launch_forms' => true,
        ];
    }

    private function sanitizeDisplayName(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');
        if ($name === '') {
            return 'anon';
        }

        return substr($name, 0, 32);
    }
}
