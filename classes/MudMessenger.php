<?php

namespace Grav\Plugin\Messenger;

require_once __DIR__ . '/MudMessengerConfig.php';

use Grav\Common\Grav;

/**
 * JSON + SSE API for GravMUD Messenger.
 */
class MudMessenger
{
    private Grav $grav;
    private MudMessengerStorage $storage;
    private bool $bridgeMode = false;
    private int $bridgeHttpCode = 200;
    /** @var array<string, mixed>|null */
    private ?array $jsonBodyOverride = null;
    private $apiUser = null;

    public function __construct(Grav $grav)
    {
        $this->grav = $grav;
        require_once __DIR__ . '/MudMessengerStorage.php';
        $this->storage = new MudMessengerStorage($grav);
    }

    public function setBridgeMode(bool $enabled): void
    {
        $this->bridgeMode = $enabled;
    }

    public function getBridgeHttpCode(): int
    {
        return $this->bridgeHttpCode;
    }

    /** @param array<string, mixed> $body */
    public function setJsonBodyOverride(array $body): void
    {
        $this->jsonBodyOverride = $body;
    }

    public function setApiUser($user): void
    {
        $this->apiUser = $user;
    }

    public function handle(string $action): void
    {
        $this->bridgeHttpCode = 200;
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            if (!$this->bridgeMode) {
                http_response_code(204);
                header('Access-Control-Allow-Origin: *');
            }
            return;
        }

        if (!$this->bridgeMode) {
            header('X-Content-Type-Options: nosniff');
            header('Access-Control-Allow-Origin: *');
        }

        try {
            if ($action === '' || $action === 'groups') {
                $this->requireMethod($method, 'GET');
                $this->respondJson($this->storage->listGroups());
                return;
            }

            if ($action === 'messages') {
                if ($method === 'GET') {
                    $group = (string) ($_GET['group'] ?? $_GET['groupId'] ?? 'general');
                    $since = isset($_GET['since']) ? (string) $_GET['since'] : null;
                    $limit = max(1, min(200, (int) ($_GET['limit'] ?? 80)));
                    $this->respondJson($this->storage->listMessages($group, $since, $limit));
                    return;
                }
                if ($method === 'POST') {
                    require_once __DIR__ . '/MudMessengerModeration.php';
                    $body = $this->readJsonBody();
                    if ($this->apiUser !== null) {
                        $body['_api_user'] = $this->apiUser;
                    }
                    $this->respondJson($this->storage->postMessage($body, new MudMessengerModeration($this->grav)));
                    return;
                }
                $this->fail('Method not allowed', 405);
                return;
            }

            if (str_starts_with($action, 'stream/')) {
                $this->requireMethod($method, 'GET');
                $group = substr($action, strlen('stream/'));
                $this->handleStream($group);
                return;
            }

            if ($action === 'giphy/search') {
                $this->requireMethod($method, 'GET');
                $this->respondJson($this->searchGiphy((string) ($_GET['q'] ?? '')));
                return;
            }

            if ($action === 'giphy/trending') {
                $this->requireMethod($method, 'GET');
                $this->respondJson($this->trendingGiphy());
                return;
            }

            if ($action === 'giphy/categories') {
                $this->requireMethod($method, 'GET');
                $this->respondJson(['ok' => true, 'categories' => $this->giphyCategories()]);
                return;
            }

            if ($action === 'theme') {
                $this->requireMethod($method, 'GET');
                require_once __DIR__ . '/MudMessengerTheme.php';
                $cfg = MudMessengerConfig::all($this->grav);
                $vars = MudMessengerTheme::resolveFromConfig($cfg);
                $this->respondJson([
                    'ok' => true,
                    'preset' => (string) ($cfg['theme_preset'] ?? 'default'),
                    'vars' => $vars,
                    'custom_css' => (string) ($cfg['theme_custom_css'] ?? ''),
                ]);
                return;
            }

            if ($action === 'swag-tags') {
                $this->requireMethod($method, 'GET');
                require_once __DIR__ . '/MudMessengerSwagTags.php';
                $this->respondJson((new MudMessengerSwagTags($this->grav))->listTags($this->apiUser));
                return;
            }

            if ($action === 'forms' || str_starts_with($action, 'forms/')) {
                $this->handleForms($method, $action);
                return;
            }

            if (str_starts_with($action, 'mod/')) {
                $this->handleMod($method, $action);
                return;
            }

            $this->fail('Unknown Messenger route.', 404);
        } catch (\InvalidArgumentException $e) {
            $this->fail($e->getMessage(), 400);
        } catch (\Throwable $e) {
            $this->fail('Messenger relay offline.', 500);
        }
    }

    private function handleStream(string $groupId): void
    {
        if ($this->bridgeMode) {
            $this->fail('SSE not available via API bridge.', 501);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: text/event-stream; charset=utf-8');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Connection: keep-alive');
        header('Access-Control-Allow-Origin: *');
        header('X-Accel-Buffering: no');

        $since = (string) ($_GET['since'] ?? '');
        $groupId = strtolower(trim(preg_replace('/[^a-z0-9_-]/', '', $groupId) ?? ''));

        @set_time_limit(0);

        for ($i = 0; $i < 8; $i++) {
            $batch = $this->storage->messagesSince($groupId, $since);
            foreach ($batch as $msg) {
                echo 'event: message' . "\n";
                echo 'data: ' . json_encode(['ok' => true, 'message' => $msg], JSON_UNESCAPED_UNICODE) . "\n\n";
                $since = (string) ($msg['id'] ?? $since);
                flush();
            }

            echo ": keepalive\n\n";
            flush();
            if (connection_aborted()) {
                break;
            }
            sleep(2);
        }
    }

    /** @return array<int, array<string, string>> */
    private function giphyCategories(): array
    {
        return [
            ['id' => 'trending', 'label' => 'Trending', 'mode' => 'trending'],
            ['id' => 'reactions', 'label' => 'Reactions', 'mode' => 'search', 'query' => 'reaction'],
            ['id' => 'love', 'label' => 'Love', 'mode' => 'search', 'query' => 'love heart'],
            ['id' => 'party', 'label' => 'Party', 'mode' => 'search', 'query' => 'party celebrate'],
            ['id' => 'gaming', 'label' => 'Gaming', 'mode' => 'search', 'query' => 'gaming'],
            ['id' => 'anime', 'label' => 'Anime', 'mode' => 'search', 'query' => 'anime'],
            ['id' => 'memes', 'label' => 'Memes', 'mode' => 'search', 'query' => 'meme'],
            ['id' => 'getgrav', 'label' => 'GetGRAV!', 'mode' => 'search', 'query' => 'rocket space launch'],
            ['id' => 'lasagna', 'label' => 'Lasagna', 'mode' => 'search', 'query' => 'lasagna food'],
        ];
    }

    /** @return array<string, mixed> */
    private function trendingGiphy(): array
    {
        return $this->fetchGiphyEndpoint('/v1/gifs/trending?limit=18&rating=g');
    }

    /** @return array<string, mixed> */
    private function searchGiphy(string $query): array
    {
        $query = trim($query);
        if ($query === '') {
            return $this->trendingGiphy();
        }

        return $this->fetchGiphyEndpoint(
            '/v1/gifs/search?q=' . rawurlencode($query) . '&limit=18&rating=g'
        );
    }

    /** @return array<string, mixed> */
    private function fetchGiphyEndpoint(string $path): array
    {
        if (!(bool) MudMessengerConfig::get($this->grav, 'giphy_enabled', true)) {
            return ['ok' => false, 'error' => 'Giphy disabled.'];
        }

        $key = trim((string) MudMessengerConfig::get($this->grav, 'giphy_api_key', ''));
        if ($key === '') {
            return ['ok' => false, 'error' => 'Giphy API key not configured in Admin → Messenger.'];
        }

        $url = 'https://api.giphy.com' . $path . (str_contains($path, '?') ? '&' : '?') . 'api_key=' . rawurlencode($key);

        $raw = $this->httpGet($url, 8);
        if ($raw === null) {
            return ['ok' => false, 'error' => 'Giphy unreachable.'];
        }

        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['data']) || !is_array($data['data'])) {
            return ['ok' => false, 'error' => 'Giphy response invalid.'];
        }

        $results = [];
        foreach ($data['data'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $images = $item['images'] ?? [];
            $fixed = is_array($images) ? ($images['fixed_height_small'] ?? $images['downsized'] ?? []) : [];
            $gifUrl = is_array($fixed) ? (string) ($fixed['url'] ?? '') : '';
            if ($gifUrl === '') {
                continue;
            }
            $results[] = [
                'id' => (string) ($item['id'] ?? ''),
                'title' => (string) ($item['title'] ?? ''),
                'url' => $gifUrl,
                'preview' => $gifUrl,
            ];
        }

        return ['ok' => true, 'results' => $results];
    }

    private function httpGet(string $url, int $timeoutSeconds = 8): ?string
    {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            if ($ch === false) {
                return null;
            }
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => min(5, $timeoutSeconds),
                CURLOPT_TIMEOUT => $timeoutSeconds,
                CURLOPT_HTTPHEADER => ['Accept: application/json'],
            ]);
            $raw = curl_exec($ch);
            curl_close($ch);

            return is_string($raw) && $raw !== '' ? $raw : null;
        }

        $ctx = stream_context_create([
            'http' => ['timeout' => $timeoutSeconds, 'header' => "Accept: application/json\r\n"],
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
        ]);
        $raw = @file_get_contents($url, false, $ctx);

        return is_string($raw) && $raw !== '' ? $raw : null;
    }

    private function handleMod(string $method, string $action): void
    {
        require_once __DIR__ . '/MudMessengerModeration.php';
        require_once __DIR__ . '/MudMessengerForms.php';
        $moderation = new MudMessengerModeration($this->grav);

        if ($action === 'mod/session') {
            $this->requireMethod($method, 'GET');
            if ($this->apiUser !== null) {
                require_once __DIR__ . '/MudMessengerIdentity.php';
                $identity = new MudMessengerIdentity($this->grav);
                $perms = $identity->moderatorPermissionsForUser($this->apiUser);
                if ($perms !== null) {
                    $this->respondJson([
                        'ok' => true,
                        'username' => $identity->displayNameForUser($this->apiUser),
                        'isModerator' => true,
                        'permissions' => $perms,
                        'banned' => false,
                    ]);
                    return;
                }
            }
            $author = (string) ($_GET['author'] ?? '');
            $modKey = (string) ($_GET['modKey'] ?? '');
            $this->respondJson($moderation->session($author, $modKey));
            return;
        }

        $body = $this->readJsonBody();
        $mod = $this->resolveModerator($moderation, $body);

        if ($action === 'mod/message/edit') {
            $this->requireMethod($method, 'POST');
            $moderation->assertPermission($mod, 'can_edit');
            $group = (string) ($body['group'] ?? $body['groupId'] ?? 'general');
            $messageId = (string) ($body['messageId'] ?? $body['id'] ?? '');
            $text = (string) ($body['body'] ?? '');
            $by = (string) ($body['author'] ?? 'mod');
            $this->respondJson($this->storage->editMessage($group, $messageId, $text, $by));
            return;
        }

        if ($action === 'mod/message/delete') {
            $this->requireMethod($method, 'POST');
            $moderation->assertPermission($mod, 'can_delete');
            $group = (string) ($body['group'] ?? $body['groupId'] ?? 'general');
            $messageId = (string) ($body['messageId'] ?? $body['id'] ?? '');
            $by = (string) ($body['author'] ?? 'mod');
            $this->respondJson($this->storage->deleteMessage($group, $messageId, $by));
            return;
        }

        if ($action === 'mod/warn') {
            $this->requireMethod($method, 'POST');
            $group = (string) ($body['group'] ?? 'general');
            $target = (string) ($body['target'] ?? '');
            $reason = (string) ($body['reason'] ?? '');
            $by = (string) ($body['author'] ?? 'mod');
            $warn = $moderation->warnUser($mod, $target, $reason, $group, $by);
            $posted = $this->storage->postMessage([
                'group' => $group,
                'author' => 'Moderator',
                'type' => 'system',
                'body' => '⚠️ Warning for ' . $target . ': ' . $reason,
            ], $moderation);
            $this->respondJson([
                'ok' => true,
                'warning' => $warn['warning'],
                'message' => $posted['message'],
            ]);
            return;
        }

        if ($action === 'mod/boot') {
            $this->requireMethod($method, 'POST');
            $group = (string) ($body['group'] ?? 'general');
            $target = (string) ($body['target'] ?? '');
            $minutes = (int) ($body['minutes'] ?? 60);
            $by = (string) ($body['author'] ?? 'mod');
            $boot = $moderation->bootUser($mod, $target, $group, $by, $minutes);
            $posted = $this->storage->postMessage([
                'group' => $group,
                'author' => 'Moderator',
                'type' => 'system',
                'body' => '🥾 ' . $target . ' removed from room for ' . $minutes . ' minutes.',
            ], $moderation);
            $this->respondJson([
                'ok' => true,
                'boot' => $boot['boot'],
                'message' => $posted['message'],
            ]);
            return;
        }

        if ($action === 'mod/ban') {
            $this->requireMethod($method, 'POST');
            $target = (string) ($body['target'] ?? '');
            $group = isset($body['group']) ? (string) $body['group'] : null;
            $days = isset($body['days']) ? (int) $body['days'] : null;
            $by = (string) ($body['author'] ?? 'mod');
            $this->respondJson($moderation->banUser($mod, $target, $by, $group, $days));
            return;
        }

        if ($action === 'mod/unban') {
            $this->requireMethod($method, 'POST');
            $target = (string) ($body['target'] ?? '');
            $group = isset($body['group']) ? (string) $body['group'] : null;
            $this->respondJson($moderation->unbanUser($mod, $target, $group));
            return;
        }

        if (str_starts_with($action, 'mod/forms/') && str_ends_with($action, '/launch')) {
            $this->requireMethod($method, 'POST');
            $moderation->assertPermission($mod, 'can_launch_forms');
            $formId = substr($action, strlen('mod/forms/'), -strlen('/launch'));
            $forms = new MudMessengerForms($this->grav);
            $snapshot = $forms->snapshot($formId);
            $group = (string) ($body['group'] ?? 'general');
            $author = (string) ($body['author'] ?? 'mod');
            $this->respondJson($this->storage->postMessage([
                'group' => $group,
                'author' => $author,
                'type' => 'form',
                'formId' => $formId,
                'form' => $snapshot,
            ], $moderation));
            return;
        }

        throw new \InvalidArgumentException('Unknown mod route.');
    }

    private function handleForms(string $method, string $action): void
    {
        require_once __DIR__ . '/MudMessengerForms.php';
        $forms = new MudMessengerForms($this->grav);

        if ($action === 'forms') {
            $this->requireMethod($method, 'GET');
            $this->respondJson($forms->listForms());
            return;
        }

        $path = trim(substr($action, strlen('forms/')), '/');
        if ($path === '') {
            throw new \InvalidArgumentException('Form id required.');
        }

        if (str_ends_with($path, '/submit')) {
            $this->requireMethod($method, 'POST');
            $formId = substr($path, 0, -strlen('/submit'));
            $body = $this->readJsonBody();
            $this->respondJson($forms->submitForm($formId, $body));
            return;
        }

        $this->requireMethod($method, 'GET');
        $this->respondJson($forms->getForm($path));
    }

    /** @param array<string, mixed> $body
     *  @return array<string, mixed>|null
     */
    private function resolveModerator(MudMessengerModeration $moderation, array $body): ?array
    {
        if ($this->apiUser !== null) {
            require_once __DIR__ . '/MudMessengerIdentity.php';
            $identity = new MudMessengerIdentity($this->grav);
            $perms = $identity->moderatorPermissionsForUser($this->apiUser);
            if ($perms !== null) {
                return $perms;
            }
        }

        $author = (string) ($body['author'] ?? '');
        $modKey = (string) ($body['modKey'] ?? '');
        $mod = $moderation->verifyModerator($author, $modKey);
        if ($mod === null) {
            throw new \InvalidArgumentException('Invalid moderator credentials.');
        }

        return $mod;
    }

    private function requireMethod(string $actual, string $expected): void
    {
        if ($actual !== $expected) {
            throw new \InvalidArgumentException('Method not allowed');
        }
    }

    /** @param array<string, mixed> $payload */
    private function respondJson(array $payload): void
    {
        if (!$this->bridgeMode) {
            header('Content-Type: application/json; charset=utf-8');
        }
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!$this->bridgeMode) {
            echo $json;
            return;
        }
        echo $json;
    }

    private function fail(string $message, int $code): void
    {
        $this->bridgeHttpCode = $code;
        $this->respondJson(['ok' => false, 'error' => $message]);
    }

    /** @return array<string, mixed> */
    private function readJsonBody(): array
    {
        if ($this->jsonBodyOverride !== null) {
            return $this->jsonBodyOverride;
        }
        $raw = (string) file_get_contents('php://input');
        if ($raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }
}
