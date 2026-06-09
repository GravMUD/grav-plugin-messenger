<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Config\Config;
use Grav\Common\User\Interfaces\UserInterface;
use Grav\Framework\Psr7\Response;
use Grav\Plugin\Api\Controllers\AbstractApiController;
use Grav\Plugin\Api\Response\ApiResponse;
use Grav\Plugin\Api\Response\ErrorResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use RocketTheme\Toolbox\File\YamlFile;

/**
 * Authenticated Admin2 config for GravFans Messenger Pro.
 */
class MudMessengerAdminBridgeController extends AbstractApiController
{
    public const ADMIN_PAGE_SLUG = 'messenger';

    private const ALLOWED_TOP = [
        'enabled', 'edition', 'api_route', 'float_bubble', 'default_group',
        'poll_interval_ms', 'message_limit', 'groups',
        'brand_title', 'show_footer_branding', 'footer_text', 'footer_url',
        'launcher_position', 'launcher_icon',
        'giphy_enabled', 'giphy_api_key', 'swag_tags_enabled', 'swag_tags_mod_only', 'swag_tags',
        'moderation_enabled', 'moderators', 'forms_enabled', 'forms',
        'theme_preset', 'theme_accent_hue', 'theme_accent_saturation', 'theme_use_preset_accent',
        'theme_radius', 'theme_density', 'theme_font', 'theme_custom_css',
        'thread_background_image',
        'admin_cockpit_bubble',
    ];

    public function config(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        if ($request->getMethod() === 'GET') {
            $this->requirePermission($request, 'api.config.read');
            return ApiResponse::create($this->readPayload());
        }

        if (in_array($request->getMethod(), ['PATCH', 'PUT'], true)) {
            $this->requirePermission($request, 'api.config.write');
            $body = $this->getRequestBody($request);
            if (!is_array($body)) {
                return ErrorResponse::create(422, 'Unprocessable Entity', 'Expected JSON object.');
            }
            $this->writeConfig($body);
            return ApiResponse::create($this->readPayload());
        }

        return ErrorResponse::create(405, 'Method Not Allowed', 'Use GET or PATCH.');
    }

    public function uploadThreadBackground(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        $this->requirePermission($request, 'api.config.write');

        $tmpPath = '';
        $clientName = 'upload.bin';
        $files = $request->getUploadedFiles();
        $upload = $files['file'] ?? null;

        if ($upload && $upload->getError() === UPLOAD_ERR_OK) {
            $clientName = (string) ($upload->getClientFilename() ?: 'upload.bin');
            $tmpPath = (string) ($upload->getStream()->getMetadata('uri') ?? '');
            if ($tmpPath === '' || !is_file($tmpPath)) {
                $tmpPath = sys_get_temp_dir() . '/mm-thread-bg-' . uniqid('', true);
                file_put_contents($tmpPath, (string) $upload->getStream());
            }
        } elseif (!empty($_FILES['file']) && is_uploaded_file((string) ($_FILES['file']['tmp_name'] ?? ''))) {
            $file = $_FILES['file'];
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                return ErrorResponse::create(400, 'Bad Request', 'Upload failed.');
            }
            $clientName = (string) ($file['name'] ?? 'upload.bin');
            $tmpPath = (string) $file['tmp_name'];
        } else {
            return ErrorResponse::create(400, 'Bad Request', 'Expected multipart field "file".');
        }

        $safe = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $clientName) ?: 'upload.bin';
        $safe = strtolower($safe);
        $ext = strtolower(pathinfo($safe, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
        if (!in_array($ext, $allowed, true)) {
            if ($tmpPath !== '' && str_starts_with($tmpPath, sys_get_temp_dir())) {
                @unlink($tmpPath);
            }
            return ErrorResponse::create(400, 'Bad Request', 'Unsupported image type.');
        }

        $locator = $this->grav['locator'];
        $destDir = $locator->findResource('user://images/messenger', true, true);
        if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
            return ErrorResponse::create(500, 'Internal Server Error', 'Could not create upload directory.');
        }

        $dest = $destDir . '/' . $safe;
        if (is_file($dest)) {
            $safe = pathinfo($safe, PATHINFO_FILENAME) . '-' . substr(uniqid(), -5) . '.' . $ext;
            $dest = $destDir . '/' . $safe;
        }

        $moved = is_uploaded_file($tmpPath)
            ? move_uploaded_file($tmpPath, $dest)
            : @rename($tmpPath, $dest);
        if (!$moved) {
            if ($tmpPath !== '' && str_starts_with($tmpPath, sys_get_temp_dir())) {
                @unlink($tmpPath);
            }
            return ErrorResponse::create(500, 'Internal Server Error', 'Could not save upload.');
        }

        return ApiResponse::create([
            'url' => '/user/images/messenger/' . $safe,
            'path' => 'user/images/messenger/' . $safe,
        ]);
    }

    public function themePresets(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        $this->requirePermission($request, 'api.config.read');
        require_once __DIR__ . '/MudMessengerTheme.php';
        return ApiResponse::create([
            'presets' => MudMessengerTheme::presets(),
            'fonts' => MudMessengerTheme::fontsForClient(),
        ]);
    }

    /** @return array<string, mixed> */
    public static function pageDefinition(Config $config): array
    {
        $edition = (string) MudMessengerConfig::get($config, 'edition', 'lite');

        return [
            'id' => self::ADMIN_PAGE_SLUG,
            'plugin' => self::ADMIN_PAGE_SLUG,
            'title' => $edition === 'pro' ? 'Messenger Pro' : 'Messenger',
            'icon' => 'fa-comment-dots',
            'page_type' => 'component',
            'has_custom_component' => true,
        ];
    }

    public function previewEmbed(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        $this->requirePermission($request, 'api.config.read');
        require_once __DIR__ . '/MudMessengerTheme.php';

        $body = $this->getRequestBody($request);
        $draft = is_array($body) ? $body : [];
        $cfg = array_merge(MudMessengerConfig::all($this->grav), $draft);
        $vars = MudMessengerTheme::resolveFromConfig($cfg);
        $style = htmlspecialchars(MudMessengerTheme::toInlineStyle($vars), ENT_QUOTES, 'UTF-8');
        $customCss = (string) ($cfg['theme_custom_css'] ?? '');
        $brand = htmlspecialchars((string) ($cfg['brand_title'] ?? 'GravFans Messenger Pro'), ENT_QUOTES, 'UTF-8');
        $giphy = ($cfg['giphy_enabled'] ?? true) !== false ? '1' : '0';
        $edition = (($cfg['edition'] ?? 'lite') === 'pro') ? 'pro' : 'lite';

        $base = rtrim((string) ($this->grav['base_url_absolute'] ?? $this->grav['base_url'] ?? ''), '/');
        $cssUrl = $base . '/user/plugins/messenger/assets/mud-messenger.css';
        $jsUrl = $base . '/user/plugins/messenger/assets/mud-messenger.js';
        $apiUrl = $base . '/api/v1/mud-messenger';
        $fontLink = MudMessengerTheme::googleFontsLink((string) ($cfg['theme_font'] ?? 'dm-sans'));
        $fontTag = $fontLink !== '' ? '<link rel="stylesheet" href="' . htmlspecialchars($fontLink, ENT_QUOTES, 'UTF-8') . '">' : '';
        $showFooter = ($cfg['show_footer_branding'] ?? true) !== false ? '1' : '0';
        $footerText = htmlspecialchars((string) ($cfg['footer_text'] ?? 'Powered by GravFans.Live'), ENT_QUOTES, 'UTF-8');
        $footerUrl = htmlspecialchars((string) ($cfg['footer_url'] ?? 'https://gravfans.live'), ENT_QUOTES, 'UTF-8');
        $customCssSafe = str_replace('</', '<\/', $customCss);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$brand} — Admin preview</title>
  {$fontTag}
  <link rel="stylesheet" href="{$cssUrl}">
  <style>
    html, body { margin: 0; height: 100%; background: #0a0a0f; }
    body { display: flex; flex-direction: column; }
    .mm-admin-embed-wrap { flex: 1; min-height: 0; padding: 0.5rem; box-sizing: border-box; }
    .mm-admin-embed-wrap .mud-messenger-root { height: 100%; }
    .mm-admin-embed-wrap .mud-messenger-panel,
    .mm-admin-embed-wrap .mud-messenger-panel.is-open {
      position: relative !important;
      inset: auto !important;
      right: auto !important;
      bottom: auto !important;
      width: 100% !important;
      height: 100% !important;
      max-height: none !important;
      display: flex !important;
      margin: 0 !important;
    }
  </style>
</head>
<body>
  <div class="mm-admin-embed-wrap">
    <div
      data-mud-messenger-embed
      data-edition="{$edition}"
      data-theme-style="{$style}"
      data-api="{$apiUrl}"
      data-group="general"
      data-giphy="{$giphy}"
      data-poll="4000"
      data-realtime="poll"
      data-brand-title="{$brand}"
      data-footer="{$showFooter}"
      data-footer-text="{$footerText}"
      data-footer-url="{$footerUrl}"
    ></div>
  </div>
  <style id="mm-admin-custom">{$customCssSafe}</style>
  <script src="{$jsUrl}"></script>
</body>
</html>
HTML;

        return new Response(200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Cache-Control' => 'no-store',
        ], $html);
    }

    public function themePreview(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        $this->requirePermission($request, 'api.config.read');
        require_once __DIR__ . '/MudMessengerTheme.php';

        $body = $this->getRequestBody($request);
        $draft = is_array($body) ? $body : [];

        return ApiResponse::create(self::launcherPayload($this->config, $this->grav, $draft));
    }

    public function launcherBootstrap(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        $this->requirePermission($request, 'api.access');
        require_once __DIR__ . '/MudMessengerTheme.php';

        $draft = [];
        if ($request->getMethod() === 'POST') {
            $body = $this->getRequestBody($request);
            if (is_array($body)) {
                $draft = $body;
            }
        }

        $user = null;
        try {
            $user = $this->getUser($request);
        } catch (\Throwable) {
            $user = null;
        }

        return ApiResponse::create(self::launcherPayload($this->config, $this->grav, $draft, $user));
    }

    public function cockpitBootJs(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return ApiResponse::create(null, 204);
        }

        require_once __DIR__ . '/MudMessengerTheme.php';
        $payload = self::launcherPayload($this->config, $this->grav);
        $js = 'window.__MM_ADMIN_COCKPIT_BOOT=' . json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ';';

        return new Response(200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'no-store',
        ], $js);
    }

    /** Build <link>/<style> tags so Admin2 shell matches frontend Paint Shop before JS boots. */
    public static function buildAdminCockpitHeadHtml(array $payload): string
    {
        $html = '';
        $cssUrl = htmlspecialchars((string) ($payload['css_url'] ?? ''), ENT_QUOTES, 'UTF-8');
        if ($cssUrl !== '') {
            $html .= '<link rel="stylesheet" href="' . $cssUrl . '" data-mm-admin-cockpit-css="1">';
        }

        $fontLink = htmlspecialchars((string) ($payload['font_link'] ?? ''), ENT_QUOTES, 'UTF-8');
        if ($fontLink !== '') {
            $html .= '<link rel="preconnect" href="https://fonts.googleapis.com">';
            $html .= '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
            $html .= '<link rel="stylesheet" href="' . $fontLink . '" data-mm-admin-cockpit-font="1">';
        }

        $style = trim((string) ($payload['style'] ?? ''));
        if ($style !== '') {
            $html .= '<style data-mm-admin-cockpit-vars>#mud-messenger-admin-cockpit.mud-messenger-root{'
                . $style
                . '}</style>';
        }

        $custom = str_replace('</', '<\/', (string) ($payload['custom_css'] ?? ''));
        if ($custom !== '') {
            $html .= '<style data-mm-admin-cockpit-custom>' . $custom . '</style>';
        }

        return $html;
    }

    /**
     * @param array<string, mixed> $draft
     * @return array<string, mixed>
     */
    public static function launcherPayload(Config $config, $grav, array $draft = [], ?UserInterface $user = null): array
    {
        require_once __DIR__ . '/MudMessengerTheme.php';
        require_once __DIR__ . '/MudMessengerIdentity.php';

        $cfg = array_merge(MudMessengerConfig::all($config), $draft);
        $vars = MudMessengerTheme::resolveFromConfig($cfg);
        $threadBg = MudMessengerTheme::threadBackgroundImage($cfg);
        $edition = (($cfg['edition'] ?? 'lite') === 'pro') ? 'pro' : 'lite';
        $base = rtrim((string) ($grav['base_url_absolute'] ?? $grav['base_url'] ?? ''), '/');
        $fontKey = (string) ($cfg['theme_font'] ?? 'dm-sans');
        $identity = new MudMessengerIdentity($grav);

        return [
            'api' => $base . '/api/v1/mud-messenger',
            'edition' => $edition,
            'is_pro' => $edition === 'pro',
            'default_group' => (string) ($cfg['default_group'] ?? 'general'),
            'giphy' => ($cfg['giphy_enabled'] ?? true) !== false ? '1' : '0',
            'poll' => (int) ($cfg['poll_interval_ms'] ?? 2500),
            'brand_title' => (string) ($cfg['brand_title'] ?? ($edition === 'pro' ? 'Messenger Pro' : 'Messenger')),
            'footer' => ($cfg['show_footer_branding'] ?? false) !== false ? '1' : '0',
            'footer_text' => (string) ($cfg['footer_text'] ?? ''),
            'footer_url' => (string) ($cfg['footer_url'] ?? ''),
            'launcher_icon' => (string) ($cfg['launcher_icon'] ?? '💬'),
            'launcher_position' => (string) ($cfg['launcher_position'] ?? 'bottom-right'),
            'theme_preset' => (string) ($cfg['theme_preset'] ?? 'default'),
            'thread_background' => $threadBg,
            'moderation' => ($edition === 'pro' && !empty($cfg['moderation_enabled'])) ? '1' : '0',
            'vars' => $vars,
            'style' => MudMessengerTheme::toInlineStyle($vars),
            'fonts' => MudMessengerTheme::fontStacks(),
            'font_link' => MudMessengerTheme::googleFontsLink($fontKey),
            'custom_css' => (string) ($cfg['theme_custom_css'] ?? ''),
            'css_url' => $base . '/user/plugins/messenger/assets/mud-messenger.css',
            'js_url' => $base . '/user/plugins/messenger/assets/mud-messenger.js',
            'session' => $identity->sessionForUser($user),
        ];
    }

    /** @return array<string, mixed> */
    public static function redactConfigForRead(array $cfg): array
    {
        $public = $cfg;
        unset($public['giphy_api_key']);

        if (isset($public['moderators']) && is_array($public['moderators'])) {
            $mods = [];
            foreach ($public['moderators'] as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $key = trim((string) ($row['mod_key'] ?? ''));
                unset($row['mod_key']);
                $row['mod_key_set'] = $key !== '';
                if ($key !== '') {
                    $row['mod_key_masked'] = str_repeat('•', max(8, strlen($key) - 4)) . substr($key, -4);
                }
                $mods[] = $row;
            }
            $public['moderators'] = $mods;
        }

        return $public;
    }

    /** @return array<string, mixed> */
    private function readPayload(): array
    {
        $cfg = MudMessengerConfig::all($this->grav);
        $key = (string) ($cfg['giphy_api_key'] ?? '');
        $masked = $key !== '' ? (str_repeat('•', max(8, strlen($key) - 4)) . substr($key, -4)) : '';

        require_once __DIR__ . '/MudMessengerTheme.php';

        return [
            'config' => self::redactConfigForRead($cfg),
            'giphy_key_set' => $key !== '',
            'giphy_key_masked' => $masked,
            'theme_presets' => MudMessengerTheme::presets(),
            'edition' => (string) ($cfg['edition'] ?? 'lite'),
            'is_pro' => ($cfg['edition'] ?? 'lite') === 'pro',
        ];
    }

    /** @param array<string, mixed> $patch */
    private function writeConfig(array $patch): void
    {
        $file = MudMessengerConfig::writeConfigPath($this->grav);
        $current = is_file($file)
            ? (array) (YamlFile::instance($file)->content() ?: [])
            : MudMessengerConfig::all($this->grav);

        foreach (self::ALLOWED_TOP as $key) {
            if (!array_key_exists($key, $patch)) {
                continue;
            }
            if ($key === 'giphy_api_key') {
                $val = trim((string) $patch[$key]);
                if ($val === '' || str_contains($val, '•')) {
                    continue;
                }
                $current[$key] = $val;
                continue;
            }
            if ($key === 'moderators' && is_array($patch[$key])) {
                $existing = is_array($current['moderators'] ?? null) ? $current['moderators'] : [];
                $merged = [];
                foreach ($patch[$key] as $i => $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $incomingKey = trim((string) ($row['mod_key'] ?? ''));
                    $priorKey = trim((string) ($existing[$i]['mod_key'] ?? ''));
                    if ($incomingKey === '' || str_contains($incomingKey, '•')) {
                        $row['mod_key'] = $priorKey;
                    }
                    unset($row['mod_key_set'], $row['mod_key_masked']);
                    $merged[] = $row;
                }
                $current['moderators'] = $merged;
                continue;
            }
            $current[$key] = $patch[$key];
        }

        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        YamlFile::instance($file)->save($current);
        $this->config->reload();
        $this->config->set('plugins.messenger', $current);
    }
}
