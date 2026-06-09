<?php

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;

/**
 * Flat-file message storage for GravMUD Messenger.
 */
class MudMessengerStorage
{
    private Grav $grav;
    private string $dir;

    public function __construct(Grav $grav)
    {
        $this->grav = $grav;
        require_once __DIR__ . '/MudMessengerData.php';
        $this->dir = MudMessengerData::dir($grav);
    }

    /** @return array<string, array<string, mixed>> */
    public function groupConfig(): array
    {
        $groups = MudMessengerConfig::get($this->grav, 'groups');
        if (!is_array($groups) || $groups === []) {
            return [
                'general' => [
                    'title' => 'General',
                    'emoji' => '💬',
                    'description' => 'Site-wide hangout',
                ],
            ];
        }

        return $groups;
    }

    public function messageLimit(): int
    {
        return max(50, min(2000, (int) MudMessengerConfig::get($this->grav, 'message_limit', 500)));
    }

    /** @return array<string, mixed> */
    public function listGroups(): array
    {
        $items = [];
        foreach ($this->groupConfig() as $id => $meta) {
            if (!is_array($meta)) {
                continue;
            }
            $items[] = [
                'id' => $id,
                'title' => (string) ($meta['title'] ?? $id),
                'emoji' => (string) ($meta['emoji'] ?? '💬'),
                'description' => (string) ($meta['description'] ?? ''),
                'messageCount' => count($this->loadMessages($id)),
            ];
        }

        return ['ok' => true, 'groups' => $items];
    }

    /** @return array<string, mixed> */
    public function listMessages(string $groupId, ?string $sinceId = null, int $limit = 80): array
    {
        $groupId = $this->sanitizeGroupId($groupId);
        $this->assertGroupExists($groupId);

        $messages = $this->loadMessages($groupId);
        if ($sinceId !== null && $sinceId !== '') {
            $found = false;
            $filtered = [];
            foreach ($messages as $msg) {
                if ($found) {
                    $filtered[] = $msg;
                    continue;
                }
                if (($msg['id'] ?? '') === $sinceId) {
                    $found = true;
                }
            }
            $messages = $found ? $filtered : $messages;
        }

        $limit = max(1, min(200, $limit));
        if (count($messages) > $limit) {
            $messages = array_slice($messages, -$limit);
        }

        return [
            'ok' => true,
            'groupId' => $groupId,
            'count' => count($messages),
            'messages' => $messages,
        ];
    }

    /** @param array<string, mixed> $payload
     *  @return array<string, mixed>
     */
    public function postMessage(array $payload, ?MudMessengerModeration $moderation = null, bool $allowPrivilegedTypes = false): array
    {
        $groupId = $this->sanitizeGroupId((string) ($payload['group'] ?? $payload['groupId'] ?? 'general'));
        $this->assertGroupExists($groupId);

        require_once __DIR__ . '/MudMessengerIdentity.php';
        $identity = new MudMessengerIdentity($this->grav);
        $apiUser = $payload['_api_user'] ?? null;
        unset($payload['_api_user']);
        try {
            $author = $identity->resolveAuthor(
                (string) ($payload['author'] ?? $payload['name'] ?? 'anon'),
                is_object($apiUser) ? $apiUser : null
            );
        } catch (\InvalidArgumentException $e) {
            throw $e;
        }
        if ($moderation !== null && $moderation->isEnabled()) {
            if ($moderation->isBanned($author, $groupId) || $moderation->isBanned($author, '*')) {
                throw new \InvalidArgumentException('You are banned from this chat.');
            }
            if ($moderation->isBooted($author, $groupId)) {
                throw new \InvalidArgumentException('You were removed from this room temporarily.');
            }
        }

        $type = strtolower((string) ($payload['type'] ?? 'text'));
        if (!$allowPrivilegedTypes && in_array($type, ['system', 'form'], true)) {
            throw new \InvalidArgumentException('Message type not allowed.');
        }

        $body = trim((string) ($payload['body'] ?? ''));
        $giphyUrl = trim((string) ($payload['giphyUrl'] ?? ''));
        $giphyId = trim((string) ($payload['giphyId'] ?? ''));
        $formId = trim((string) ($payload['formId'] ?? ''));
        $formSnapshot = $payload['form'] ?? null;

        if ($type === 'giphy') {
            if ($giphyUrl === '') {
                throw new \InvalidArgumentException('Giphy URL required.');
            }
            require_once __DIR__ . '/MudMessengerGiphy.php';
            $giphyUrl = MudMessengerGiphy::assertAllowedUrl($giphyUrl);
            $body = '';
        } elseif ($type === 'form') {
            if ($formId === '' || !is_array($formSnapshot)) {
                throw new \InvalidArgumentException('Form snapshot required.');
            }
            $body = (string) ($formSnapshot['title'] ?? $formId);
        } elseif ($type === 'system') {
            if ($body === '') {
                throw new \InvalidArgumentException('System message cannot be empty.');
            }
        } elseif ($body === '') {
            throw new \InvalidArgumentException('Message cannot be empty.');
        }

        if ($type === 'text') {
            require_once __DIR__ . '/MudMessengerSwagTags.php';
            $swag = new MudMessengerSwagTags($this->grav);
            $swag->assertCanPostSwagInBody(
                $body,
                is_object($apiUser) ? $apiUser : null,
                $author,
                trim((string) ($payload['modKey'] ?? ''))
            );
        }

        if (strlen($body) > 4000) {
            throw new \InvalidArgumentException('Message too long.');
        }

        $message = [
            'id' => 'msg_' . bin2hex(random_bytes(8)),
            'group' => $groupId,
            'author' => $author,
            'author_role' => $identity->roleForAuthor($author, is_object($apiUser) ? $apiUser : null),
            'body' => $body,
            'type' => in_array($type, ['text', 'giphy', 'emoji', 'form', 'system'], true) ? $type : 'text',
            'giphyId' => $giphyId !== '' ? $giphyId : null,
            'giphyUrl' => $giphyUrl !== '' ? $giphyUrl : null,
            'formId' => $type === 'form' ? $formId : null,
            'form' => $type === 'form' && is_array($formSnapshot) ? $formSnapshot : null,
            'ts' => gmdate('c'),
        ];

        $messages = $this->loadMessages($groupId);
        $messages[] = $message;
        $cap = $this->messageLimit();
        if (count($messages) > $cap) {
            $messages = array_slice($messages, -$cap);
        }
        $this->saveMessages($groupId, $messages);

        return ['ok' => true, 'message' => $message];
    }

    /** @return array<string, mixed> */
    public function editMessage(string $groupId, string $messageId, string $body, string $editedBy): array
    {
        $groupId = $this->sanitizeGroupId($groupId);
        $this->assertGroupExists($groupId);
        $body = trim($body);
        if ($body === '') {
            throw new \InvalidArgumentException('Message cannot be empty.');
        }

        $messages = $this->loadMessages($groupId);
        $found = false;
        $updated = [];
        foreach ($messages as &$msg) {
            if (($msg['id'] ?? '') !== $messageId) {
                continue;
            }
            if (($msg['type'] ?? 'text') !== 'text') {
                throw new \InvalidArgumentException('Only text messages can be edited.');
            }
            $msg['body'] = $body;
            $msg['edited'] = true;
            $msg['editedBy'] = $this->sanitizeAuthor($editedBy);
            $msg['editedTs'] = gmdate('c');
            $found = true;
            $updated = $msg;
            break;
        }
        unset($msg);

        if (!$found) {
            throw new \InvalidArgumentException('Message not found.');
        }

        $this->saveMessages($groupId, $messages);

        return ['ok' => true, 'message' => $updated];
    }

    /** @return array<string, mixed> */
    public function deleteMessage(string $groupId, string $messageId, string $deletedBy): array
    {
        $groupId = $this->sanitizeGroupId($groupId);
        $this->assertGroupExists($groupId);

        $messages = $this->loadMessages($groupId);
        $found = false;
        $updated = [];
        foreach ($messages as &$msg) {
            if (($msg['id'] ?? '') !== $messageId) {
                continue;
            }
            $msg['deleted'] = true;
            $msg['body'] = '[message removed by moderator]';
            $msg['type'] = 'system';
            $msg['deletedBy'] = $this->sanitizeAuthor($deletedBy);
            $msg['deletedTs'] = gmdate('c');
            $found = true;
            $updated = $msg;
            break;
        }
        unset($msg);

        if (!$found) {
            throw new \InvalidArgumentException('Message not found.');
        }

        $this->saveMessages($groupId, $messages);

        return ['ok' => true, 'message' => $updated];
    }

    /** @return list<array<string, mixed>> */
    public function messagesSince(string $groupId, string $sinceId): array
    {
        $groupId = $this->sanitizeGroupId($groupId);
        $this->assertGroupExists($groupId);

        $messages = $this->loadMessages($groupId);
        if ($sinceId === '') {
            return count($messages) > 0 ? [end($messages)] : [];
        }

        $out = [];
        $found = false;
        foreach ($messages as $msg) {
            if ($found) {
                $out[] = $msg;
            } elseif (($msg['id'] ?? '') === $sinceId) {
                $found = true;
            }
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function loadMessages(string $groupId): array
    {
        $file = $this->messageFile($groupId);
        if (!is_readable($file)) {
            return [];
        }
        $raw = (string) file_get_contents($file);
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return [];
        }

        return array_values(array_filter($data, static fn($m): bool => is_array($m) && !empty($m['id'])));
    }

    /** @param list<array<string, mixed>> $messages */
    private function saveMessages(string $groupId, array $messages): void
    {
        $dir = $this->dir . '/groups/' . $groupId;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $file = $this->messageFile($groupId);
        $json = json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Could not encode messages.');
        }
        file_put_contents($file, $json, LOCK_EX);
    }

    private function messageFile(string $groupId): string
    {
        return $this->dir . '/groups/' . $groupId . '/messages.json';
    }

    private function sanitizeGroupId(string $id): string
    {
        $id = strtolower(trim($id));
        $id = preg_replace('/[^a-z0-9_-]/', '', $id) ?? '';
        if ($id === '') {
            throw new \InvalidArgumentException('Invalid group id.');
        }

        return $id;
    }

    private function sanitizeAuthor(string $name): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');
        if ($name === '') {
            $name = 'anon';
        }
        if (strlen($name) > 32) {
            $name = substr($name, 0, 32);
        }

        return $name;
    }

    private function assertGroupExists(string $groupId): void
    {
        if (!isset($this->groupConfig()[$groupId])) {
            throw new \InvalidArgumentException('Unknown group: ' . $groupId);
        }
    }
}
