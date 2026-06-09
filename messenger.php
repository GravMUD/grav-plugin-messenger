<?php

namespace Grav\Plugin;

require_once __DIR__ . '/classes/MudMessengerConfig.php';

use Composer\Autoload\ClassLoader;
use Grav\Common\Plugin;
use Grav\Plugin\Messenger\MudMessengerAdminBridgeController;
use Grav\Plugin\Messenger\MudMessengerApiBridgeController;
use Grav\Plugin\Messenger\MudMessengerConfig;
use Grav\Plugin\Messenger\MudMessengerTheme;
use RocketTheme\Toolbox\Event\Event;

class MessengerPlugin extends Plugin
{
    public const ADMIN_PAGE_SLUG = 'messenger';

    public static function getSubscribedEvents(): array
    {
        $events = [
            'onPluginsInitialized' => [['onPluginsInitializedEarly', 100000]],
            'onPagesInitialized' => ['onPagesInitialized', 0],
            'onPageNotFound' => ['onPagesInitialized', 0],
            'onTwigInitialized' => ['onTwigInitialized', 0],
            'onTwigSiteVariables' => ['onTwigSiteVariables', 0],
            'onOutputGenerated' => ['onOutputGenerated', 0],
            'onAdmin2SpaShellHead' => ['onAdmin2SpaShellHead', 0],
        ];

        if (self::supportsGravApiBridge()) {
            $events['onApiRegisterRoutes'] = ['onApiRegisterRoutes', 0];
            $events['onApiCollectPublicRoutes'] = ['onApiCollectPublicRoutes', 0];
            $events['onApiSidebarItems'] = ['onApiSidebarItems', 0];
            $events['onApiPluginPageInfo'] = ['onApiPluginPageInfo', 0];
            $events['onApiAdminSettingsPanels'] = ['onApiAdminSettingsPanels', 0];
            $events['onApiFloatingWidgets'] = ['onApiFloatingWidgets', 0];
        }

        return $events;
    }

    public function autoload(): ClassLoader
    {
        $loader = new ClassLoader();
        $loader->addPsr4('Grav\\Plugin\\Messenger\\', __DIR__ . '/classes');
        $loader->register(true);

        return $loader;
    }

    /** @return array<string, mixed> */
    public static function pluginConfig($grav): array
    {
        return MudMessengerConfig::all($grav);
    }

    public function onPluginsInitializedEarly(): void
    {
        if (!$this->isEnabled() || !self::supportsGravApiBridge()) {
            return;
        }

        require_once __DIR__ . '/classes/MudMessengerApiBridgeController.php';
        require_once __DIR__ . '/classes/MudMessengerAdminBridgeController.php';
        require_once __DIR__ . '/classes/MudMessenger.php';
    }

    public function onPagesInitialized(): void
    {
        if (!$this->isEnabled() || $this->isAdmin()) {
            return;
        }

        $action = $this->apiAction();
        if ($action !== null) {
            if (class_exists(\Grav\Plugin\Api\ApiRouteCollector::class)) {
                return;
            }

            require_once __DIR__ . '/classes/MudMessenger.php';
            require_once __DIR__ . '/classes/MudMessengerMambersBridge.php';
            $messenger = new \Grav\Plugin\Messenger\MudMessenger($this->grav);
            $siteUser = \Grav\Plugin\Messenger\MudMessengerMambersBridge::siteUser($this->grav);
            if ($siteUser !== null) {
                $messenger->setApiUser($siteUser);
            }
            $messenger->handle($action);
            exit;
        }

        if ($this->isEnabled() && !$this->isEmbedRequest()) {
            $this->registerAssets();
        }
    }

    public function onApiRegisterRoutes(Event $event): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        require_once __DIR__ . '/classes/MudMessengerApiBridgeController.php';
        require_once __DIR__ . '/classes/MudMessengerAdminBridgeController.php';

        $routes = $event['routes'];
        $controller = [MudMessengerApiBridgeController::class, 'handle'];
        $admin = MudMessengerAdminBridgeController::class;

        $routes->addRoute(['GET', 'PATCH', 'PUT', 'OPTIONS'], '/messenger/admin/config', [$admin, 'config']);
        $routes->addRoute(['POST', 'OPTIONS'], '/messenger/admin/thread-background', [$admin, 'uploadThreadBackground']);
        $routes->addRoute(['GET', 'OPTIONS'], '/messenger/admin/theme-presets', [$admin, 'themePresets']);
        $routes->addRoute(['POST', 'OPTIONS'], '/messenger/admin/theme-preview', [$admin, 'themePreview']);
        $routes->addRoute(['POST', 'OPTIONS'], '/messenger/admin/preview-embed', [$admin, 'previewEmbed']);
        $routes->addRoute(['GET', 'POST', 'OPTIONS'], '/messenger/admin/launcher-bootstrap', [$admin, 'launcherBootstrap']);
        $routes->addRoute(['GET', 'OPTIONS'], '/messenger/admin/cockpit-boot.js', [$admin, 'cockpitBootJs']);
        $routes->addRoute(['GET', 'POST', 'OPTIONS'], '/mud-messenger', $controller);
        $routes->addRoute(['GET', 'POST', 'OPTIONS'], '/mud-messenger/{subpath:.+}', $controller);
    }

    public function onApiCollectPublicRoutes(Event $event): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $apiBase = (string) ($event['api_base'] ?? '/api/v1');
        $prefixes = (array) ($event['prefixes'] ?? []);
        $prefixes[] = rtrim($apiBase, '/') . '/mud-messenger';
        $event['prefixes'] = $prefixes;

        $exact = (array) ($event['exact'] ?? []);
        $bootPath = '/messenger/admin/cockpit-boot.js';
        $exact[] = rtrim($apiBase, '/') . $bootPath;
        $exact[] = $bootPath;
        $event['exact'] = $exact;
    }

    public function onTwigInitialized(): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $path = __DIR__ . '/templates';
        if (is_dir($path)) {
            $this->grav['twig']->twig_paths[] = $path;
        }
    }

    public function onTwigSiteVariables(): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $cfg = self::pluginConfig($this->grav);
        $edition = (string) ($cfg['edition'] ?? 'lite');
        $isPro = $edition === 'pro';
        $brandTitle = trim((string) ($cfg['brand_title'] ?? ''));
        if ($brandTitle === '') {
            $brandTitle = $isPro ? 'GravFans Messenger Pro' : 'GravFans Messenger';
        }

        $route = trim((string) ($cfg['api_route'] ?? 'api/mud-messenger'), '/');
        if (self::supportsGravApiBridge()) {
            $route = 'api/v1/mud-messenger';
        }
        $base = rtrim((string) $this->grav['base_url'], '/');

        require_once __DIR__ . '/classes/MudMessengerTheme.php';
        require_once __DIR__ . '/classes/MudMessengerMambersBridge.php';
        require_once __DIR__ . '/classes/MudMessengerIdentity.php';
        $themeVars = MudMessengerTheme::resolveFromConfig($cfg);
        $themeStyle = MudMessengerTheme::toInlineStyle($themeVars);

        $siteSession = null;
        $siteSessionJson = '';
        $siteUser = MudMessengerMambersBridge::siteUser($this->grav);
        if ($siteUser !== null) {
            $siteSession = (new MudMessengerIdentity($this->grav))->sessionForUser($siteUser);
            if ($siteSession !== null) {
                $siteSessionJson = htmlspecialchars(
                    (string) json_encode($siteSession, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ENT_QUOTES,
                    'UTF-8'
                );
            }
        }

        $this->grav['twig']->twig_vars['grav_mud_messenger'] = [
            'enabled' => true,
            'edition' => $edition,
            'is_pro' => $isPro,
            'name' => $brandTitle,
            'product' => $isPro ? 'GravFans Messenger Pro' : 'GravFans Messenger',
            'version' => '0.3.2',
            'api_route' => $route,
            'api' => $base . '/' . $route,
            'default_group' => (string) ($cfg['default_group'] ?? 'general'),
            'float_bubble' => !empty($cfg['float_bubble']),
            'giphy_enabled' => !empty($cfg['giphy_enabled']),
            'poll_interval_ms' => (int) ($cfg['poll_interval_ms'] ?? 2500),
            'realtime' => (string) ($cfg['realtime'] ?? 'poll'),
            'show_footer_branding' => !empty($cfg['show_footer_branding']),
            'footer_text' => (string) ($cfg['footer_text'] ?? 'Powered by GravFans.Live'),
            'footer_url' => (string) ($cfg['footer_url'] ?? 'https://gravfans.live'),
            'launcher_position' => (string) ($cfg['launcher_position'] ?? 'bottom-right'),
            'launcher_icon' => (string) ($cfg['launcher_icon'] ?? '💬'),
            'theme_preset' => (string) ($cfg['theme_preset'] ?? 'default'),
            'theme_style' => $themeStyle,
            'theme_custom_css' => (string) ($cfg['theme_custom_css'] ?? ''),
            'thread_background' => MudMessengerTheme::threadBackgroundImage($cfg),
            'moderation_enabled' => $isPro && !empty($cfg['moderation_enabled']),
            'mambers_bridge' => MudMessengerMambersBridge::identityBridgeEnabled($this->grav),
            'site_session' => $siteSession,
            'site_session_json' => $siteSessionJson,
        ];
    }

    public function onAdmin2SpaShellHead(Event $event): void
    {
        if (!$this->isEnabled()) {
            return;
        }

        $cfg = self::pluginConfig($this->grav);
        if (($cfg['admin_cockpit_bubble'] ?? true) === false) {
            return;
        }

        $base = rtrim((string) ($this->grav['base_url'] ?? ''), '/');
        $apiRoute = trim((string) $this->grav['config']->get('plugins.api.route', '/api'), '/');
        $apiVersion = trim((string) $this->grav['config']->get('plugins.api.version_prefix', 'v1'), '/');
        $bootUrl = htmlspecialchars($base . '/' . $apiRoute . '/' . $apiVersion . '/messenger/admin/cockpit-boot.js', ENT_QUOTES, 'UTF-8');
        $cockpitUrl = htmlspecialchars($base . '/user/plugins/messenger/assets/mud-messenger-admin-cockpit.js', ENT_QUOTES, 'UTF-8');

        require_once __DIR__ . '/classes/MudMessengerAdminBridgeController.php';
        $bootPayload = MudMessengerAdminBridgeController::launcherPayload($this->grav['config'], $this->grav);
        $bootJson = json_encode($bootPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $themeHead = MudMessengerAdminBridgeController::buildAdminCockpitHeadHtml($bootPayload);

        $event['html'] = ($event['html'] ?? '')
            . $themeHead
            . '<script>window.__MM_ADMIN_COCKPIT_BOOT=' . $bootJson . ';</script>'
            . '<script src="' . $bootUrl . '"></script>'
            . '<script src="' . $cockpitUrl . '" defer data-mm-admin-cockpit-shell="1"></script>';
    }

    public function onApiSidebarItems(Event $event): void
    {
        if (!$this->isEnabled() || !$this->canUseAdmin2($event['user'] ?? null)) {
            return;
        }

        $edition = (string) MudMessengerConfig::get($this->grav, 'edition', 'lite');
        $label = $edition === 'pro' ? 'Messenger Pro' : 'Messenger';

        $items = $event['items'] ?? [];
        $items[] = [
            'id' => self::ADMIN_PAGE_SLUG,
            'plugin' => self::ADMIN_PAGE_SLUG,
            'label' => $label,
            'icon' => 'fa-comment-dots',
            'route' => '/plugin/' . self::ADMIN_PAGE_SLUG,
            'priority' => 82,
        ];
        $event['items'] = $items;
    }

    public function onApiPluginPageInfo(Event $event): void
    {
        $plugin = (string) ($event['plugin'] ?? '');
        if (!$this->isEnabled() || $plugin !== self::ADMIN_PAGE_SLUG) {
            return;
        }

        if (!$this->canUseAdmin2($event['user'] ?? null)) {
            return;
        }

        $event['definition'] = MudMessengerAdminBridgeController::pageDefinition($this->grav['config']);
    }

    public function onApiFloatingWidgets(Event $event): void
    {
        if (!$this->isEnabled() || !$this->canUseAdmin2($event['user'] ?? null)) {
            return;
        }

        $cfg = self::pluginConfig($this->grav);
        if (($cfg['admin_cockpit_bubble'] ?? true) === false) {
            return;
        }

        $widgets = $event['widgets'] ?? [];
        $widgets[] = [
            'id' => 'messenger.cockpit',
            'plugin' => 'messenger',
            'label' => 'Community chat',
            'icon' => 'message-circle',
            'priority' => 95,
            'autoLoad' => true,
            'showFab' => false,
            'authorize' => 'api.access',
        ];
        $event['widgets'] = $widgets;
    }

    public function onApiAdminSettingsPanels(Event $event): void
    {
        if (!$this->isEnabled() || !$this->canUseAdmin2($event['user'] ?? null, true)) {
            return;
        }

        $panels = $event['panels'] ?? [];
        $panels[] = [
            'id' => 'messenger',
            'plugin' => 'messenger',
            'label' => 'GravFans Messenger',
            'description' => 'Giphy, moderation, forms, Paint Shop theming',
            'icon' => 'fa-comment-dots',
            'blueprint' => 'messenger-settings',
            'data_endpoint' => '/config/plugins/messenger',
            'save_endpoint' => '/config/plugins/messenger',
            'priority' => 13,
        ];
        $event['panels'] = $panels;
    }

    /** @param mixed $user */
    private function canUseAdmin2($user, bool $settings = false): bool
    {
        if (!$user || !is_object($user) || !method_exists($user, 'get')) {
            return false;
        }

        if ($user->get('access.api.super')) {
            return true;
        }

        if ($settings) {
            return (bool) ($user->get('access.api.config.read') || $user->get('access.api.config.write'));
        }

        return (bool) ($user->get('access.api.access') || $user->get('access.api.system.read'));
    }

    public function onOutputGenerated(Event $event): void
    {
        if (!$this->shouldInjectWidget()) {
            return;
        }

        $html = $this->renderWidgetHtml();
        if ($html === '') {
            return;
        }

        $output = &$event['output'];
        if (is_string($output) && str_contains($output, '</body>')) {
            $output = preg_replace('/<\/body>/i', $html . "\n</body>", $output, 1) ?? $output;
        }
    }

    private function renderWidgetHtml(): string
    {
        try {
            return (string) $this->grav['twig']->processTemplate('partials/mud-messenger-launcher.html.twig');
        } catch (\Throwable $e) {
            return '';
        }
    }

    private function registerAssets(): void
    {
        $assets = $this->grav['assets'];
        $assets->addCss('plugin://messenger/assets/mud-messenger.css');
        $assets->addJs('plugin://messenger/assets/mud-messenger.js', ['group' => 'bottom', 'loading' => 'defer']);
    }

    private function shouldInjectWidget(): bool
    {
        if (!$this->isEnabled() || $this->isAdmin() || $this->isEmbedRequest()) {
            return false;
        }

        $cfg = self::pluginConfig($this->grav);
        return !empty($cfg['float_bubble']);
    }

    private function isEmbedRequest(): bool
    {
        $uri = $this->grav['uri'];
        foreach (['gravmud-embed', 'gravity-embed'] as $key) {
            $v = $uri->query($key) ?: $uri->param($key);
            if ($v !== null && $v !== '') {
                return true;
            }
        }

        return false;
    }

    private function isEnabled(): bool
    {
        return MudMessengerConfig::isEnabled($this->grav);
    }

    private function apiAction(): ?string
    {
        $route = trim((string) MudMessengerConfig::get($this->grav, 'api_route', 'api/mud-messenger'), '/');
        $path = trim((string) $this->grav['uri']->path(), '/');

        if ($path === $route) {
            return '';
        }

        if (!str_starts_with($path, $route . '/')) {
            return null;
        }

        return trim(substr($path, strlen($route)), '/');
    }

    private static function supportsGravApiBridge(): bool
    {
        return class_exists(\Grav\Plugin\Api\ApiRouteCollector::class);
    }
}
