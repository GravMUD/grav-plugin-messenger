<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

/**
 * Messenger Paint Shop — CSS variable presets (JavaBean-style, site-local).
 */
class MudMessengerTheme
{
    /** @return array<int, array<string, mixed>> */
    public static function presets(): array
    {
        return [
            [
                'id' => 'default',
                'label' => 'Grav Blue',
                'tagline' => 'Classic Messenger energy',
                'vars' => [
                    '--mm-accent' => '#0082c0',
                    '--mm-accent-dark' => '#006699',
                    '--mm-bg' => '#ffffff',
                    '--mm-bg-alt' => '#f0f2f5',
                    '--mm-border' => '#e4e6eb',
                    '--mm-text' => '#050505',
                    '--mm-muted' => '#65676b',
                    '--mm-bubble-me' => '#0084ff',
                    '--mm-bubble-them' => '#e4e6eb',
                    '--mm-input-bg' => '#ffffff',
                    '--mm-input-border' => '#ccd0d5',
                    '--mm-input-text' => '#050505',
                    '--mm-input-placeholder' => '#65676b',
                ],
            ],
            [
                'id' => 'goggrav',
                'label' => 'GetGRAV! Space',
                'tagline' => 'Campaign red · starfield nights',
                'vars' => [
                    '--mm-accent' => '#e21111',
                    '--mm-accent-dark' => '#b80d0d',
                    '--mm-bg' => '#0f1118',
                    '--mm-bg-alt' => '#181c28',
                    '--mm-border' => '#2a3144',
                    '--mm-text' => '#f4f6fb',
                    '--mm-muted' => '#9aa3b8',
                    '--mm-bubble-me' => '#ff4757',
                    '--mm-bubble-them' => '#252b3d',
                    '--mm-input-bg' => '#121722',
                    '--mm-input-border' => '#3a4258',
                    '--mm-input-text' => '#f4f6fb',
                    '--mm-input-placeholder' => '#7a849c',
                ],
            ],
            [
                'id' => 'javabean',
                'label' => 'JavaBean Sunset',
                'tagline' => 'Lasagna-hour coffee warmth',
                'vars' => [
                    '--mm-accent' => '#c45a1a',
                    '--mm-accent-dark' => '#8f3d0f',
                    '--mm-bg' => '#faf6f0',
                    '--mm-bg-alt' => '#f0e8dc',
                    '--mm-border' => '#dccfbf',
                    '--mm-text' => '#2a1f14',
                    '--mm-muted' => '#6b5a48',
                    '--mm-bubble-me' => '#c45a1a',
                    '--mm-bubble-them' => '#e8ddd0',
                    '--mm-input-bg' => '#fffdf9',
                    '--mm-input-border' => '#d4c4b0',
                    '--mm-input-text' => '#2a1f14',
                    '--mm-input-placeholder' => '#8a7560',
                ],
            ],
            [
                'id' => 'kersey',
                'label' => 'Kersey Goth',
                'tagline' => 'Sardonic purple · 3am approved',
                'vars' => [
                    '--mm-accent' => '#a855f7',
                    '--mm-accent-dark' => '#7c3aed',
                    '--mm-bg' => '#0c0a10',
                    '--mm-bg-alt' => '#15121c',
                    '--mm-border' => '#2d2640',
                    '--mm-text' => '#ece6ff',
                    '--mm-muted' => '#9d8fc4',
                    '--mm-bubble-me' => '#9333ea',
                    '--mm-bubble-them' => '#1f1a2e',
                    '--mm-input-bg' => '#110e18',
                    '--mm-input-border' => '#3d3454',
                    '--mm-input-text' => '#ece6ff',
                    '--mm-input-placeholder' => '#7a6a9e',
                ],
            ],
            [
                'id' => 'synthwave',
                'label' => 'Team DC Synthwave',
                'tagline' => 'FutureVision neon nights',
                'vars' => [
                    '--mm-accent' => '#ff5cf4',
                    '--mm-accent-dark' => '#c026d3',
                    '--mm-bg' => '#120818',
                    '--mm-bg-alt' => '#1a0f24',
                    '--mm-border' => '#3d2454',
                    '--mm-text' => '#fce7ff',
                    '--mm-muted' => '#c4a3d9',
                    '--mm-bubble-me' => '#d946ef',
                    '--mm-bubble-them' => '#241530',
                    '--mm-input-bg' => '#160d20',
                    '--mm-input-border' => '#4a3060',
                    '--mm-input-text' => '#fce7ff',
                    '--mm-input-placeholder' => '#9a7ab8',
                ],
            ],
            [
                'id' => 'cathedral',
                'label' => 'Grav Cathedral',
                'tagline' => 'Andy blues · respectful light',
                'vars' => [
                    '--mm-accent' => '#2563eb',
                    '--mm-accent-dark' => '#1d4ed8',
                    '--mm-bg' => '#f8fafc',
                    '--mm-bg-alt' => '#eef2ff',
                    '--mm-border' => '#cbd5e1',
                    '--mm-text' => '#0f172a',
                    '--mm-muted' => '#64748b',
                    '--mm-bubble-me' => '#3b82f6',
                    '--mm-bubble-them' => '#e2e8f0',
                    '--mm-input-bg' => '#ffffff',
                    '--mm-input-border' => '#94a3b8',
                    '--mm-input-text' => '#0f172a',
                    '--mm-input-placeholder' => '#64748b',
                ],
            ],
            [
                'id' => 'terminal',
                'label' => 'EvvyTink Terminal',
                'tagline' => 'Green phosphor · spec weird',
                'vars' => [
                    '--mm-accent' => '#22c55e',
                    '--mm-accent-dark' => '#15803d',
                    '--mm-bg' => '#050a06',
                    '--mm-bg-alt' => '#0a140c',
                    '--mm-border' => '#1a3d24',
                    '--mm-text' => '#bbf7d0',
                    '--mm-muted' => '#6ee7a0',
                    '--mm-bubble-me' => '#16a34a',
                    '--mm-bubble-them' => '#0f1f14',
                    '--mm-input-bg' => '#071009',
                    '--mm-input-border' => '#22543a',
                    '--mm-input-text' => '#bbf7d0',
                    '--mm-input-placeholder' => '#4ade80',
                ],
            ],
            [
                'id' => 'mambo',
                'label' => 'Mambo Desktop',
                'tagline' => 'CRT nostalgia · taskbar tan',
                'vars' => [
                    '--mm-accent' => '#b45309',
                    '--mm-accent-dark' => '#92400e',
                    '--mm-bg' => '#e8dcc8',
                    '--mm-bg-alt' => '#ddd0b8',
                    '--mm-border' => '#a89878',
                    '--mm-text' => '#2a2218',
                    '--mm-muted' => '#6b5d48',
                    '--mm-bubble-me' => '#c27803',
                    '--mm-bubble-them' => '#d4c4a8',
                    '--mm-input-bg' => '#f5efe3',
                    '--mm-input-border' => '#b8a888',
                    '--mm-input-text' => '#2a2218',
                    '--mm-input-placeholder' => '#8a7860',
                ],
            ],
        ];
    }

    /** @return array<string, array<string, string>> */
    public static function fontStacks(): array
    {
        $javabean = GRAV_ROOT . '/user/plugins/javabean-admin2/classes/JavaBeanFontCatalog.php';
        if (is_file($javabean)) {
            require_once $javabean;
            return \Grav\Plugin\JavaBeanAdmin2\JavaBeanFontCatalog::stacks();
        }

        return [
            'dm-sans' => '"DM Sans", ui-sans-serif, system-ui, sans-serif',
            'inter' => '"Inter", ui-sans-serif, system-ui, sans-serif',
            'jost' => '"Jost", ui-sans-serif, system-ui, sans-serif',
            'space-grotesk' => '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
            'jetbrains-mono' => '"JetBrains Mono", ui-monospace, monospace',
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public static function fontsForClient(): array
    {
        $javabean = GRAV_ROOT . '/user/plugins/javabean-admin2/classes/JavaBeanFontCatalog.php';
        if (is_file($javabean)) {
            require_once $javabean;
            return \Grav\Plugin\JavaBeanAdmin2\JavaBeanFontCatalog::forClient();
        }

        $out = [];
        foreach (self::fontStacks() as $slug => $stack) {
            $out[] = [
                'slug' => $slug,
                'label' => ucwords(str_replace('-', ' ', $slug)),
                'category' => str_contains($slug, 'mono') ? 'mono' : 'sans',
                'stack' => $stack,
                'google' => null,
                'andy' => false,
            ];
        }

        return $out;
    }

    public static function googleFontsLink(string $fontKey): string
    {
        $javabean = GRAV_ROOT . '/user/plugins/javabean-admin2/classes/JavaBeanFontCatalog.php';
        if (is_file($javabean)) {
            require_once $javabean;
            $all = \Grav\Plugin\JavaBeanAdmin2\JavaBeanFontCatalog::all();
            $google = $all[$fontKey]['google'] ?? null;
            if (is_string($google) && $google !== '') {
                return 'https://fonts.googleapis.com/css2?family=' . $google . '&display=swap';
            }
        }

        $fallback = [
            'dm-sans' => 'DM+Sans:wght@400;500;600;700',
            'inter' => 'Inter:wght@400;500;600;700',
            'jost' => 'Jost:wght@400;500;600;700',
            'space-grotesk' => 'Space+Grotesk:wght@400;500;600;700',
            'jetbrains-mono' => 'JetBrains+Mono:wght@400;500;600;700',
        ];
        if (isset($fallback[$fontKey])) {
            return 'https://fonts.googleapis.com/css2?family=' . $fallback[$fontKey] . '&display=swap';
        }

        return '';
    }

    /** @return array<string, string> */
    public static function varsForPreset(string $presetId): array
    {
        foreach (self::presets() as $preset) {
            if (($preset['id'] ?? '') === $presetId) {
                $vars = $preset['vars'] ?? [];
                return is_array($vars) ? $vars : [];
            }
        }

        $first = self::presets()[0]['vars'] ?? [];
        return is_array($first) ? $first : [];
    }

    /** @param array<string, mixed> $cfg */
    public static function resolveFromConfig(array $cfg): array
    {
        $preset = trim((string) ($cfg['theme_preset'] ?? 'default'));
        $vars = self::varsForPreset($preset !== '' ? $preset : 'default');

        $usePresetAccent = !array_key_exists('theme_use_preset_accent', $cfg) || !empty($cfg['theme_use_preset_accent']);
        $hue = $cfg['theme_accent_hue'] ?? null;
        if (!$usePresetAccent && $hue !== null && $hue !== '') {
            $h = max(0, min(360, (int) $hue));
            $s = max(0, min(100, (int) ($cfg['theme_accent_saturation'] ?? 85)));
            $vars['--mm-accent'] = "hsl({$h} {$s}% 45%)";
            $vars['--mm-accent-dark'] = "hsl({$h} {$s}% 35%)";
            $vars['--mm-bubble-me'] = "hsl({$h} " . min(100, $s + 5) . "% 50%)";
        }

        $radiusMap = ['subtle' => '0.55rem', 'default' => '1rem', 'round' => '1.35rem'];
        $radius = (string) ($cfg['theme_radius'] ?? 'default');
        $vars['--mm-radius'] = $radiusMap[$radius] ?? $radiusMap['default'];

        $densityMap = [
            'compact' => ['--mm-ui-pad' => '0.35rem', '--mm-ui-gap' => '0.35rem'],
            'comfy' => ['--mm-ui-pad' => '0.55rem', '--mm-ui-gap' => '0.5rem'],
            'spacious' => ['--mm-ui-pad' => '0.75rem', '--mm-ui-gap' => '0.65rem'],
        ];
        $density = (string) ($cfg['theme_density'] ?? 'comfy');
        foreach ($densityMap[$density] ?? $densityMap['comfy'] as $key => $value) {
            $vars[$key] = $value;
        }

        $fontKey = (string) ($cfg['theme_font'] ?? 'dm-sans');
        $fonts = self::fontStacks();
        if (isset($fonts[$fontKey])) {
            $vars['--mm-font-family'] = $fonts[$fontKey];
        }

        return $vars;
    }

    /** Default thread watermark for a preset when no custom image is set. */
    public static function defaultThreadBackgroundForPreset(string $presetId): string
    {
        return match ($presetId) {
            'goggrav' => '/assets/getgrav-logo.svg',
            default => '',
        };
    }

    /** @param array<string, mixed> $cfg */
    public static function threadBackgroundImage(array $cfg): string
    {
        $custom = trim((string) ($cfg['thread_background_image'] ?? ''));
        if ($custom !== '') {
            return $custom;
        }

        return self::defaultThreadBackgroundForPreset(trim((string) ($cfg['theme_preset'] ?? 'default')));
    }

    /** @param array<string, string> $vars */
    public static function toInlineStyle(array $vars): string
    {
        $parts = [];
        foreach ($vars as $key => $value) {
            if (!str_starts_with($key, '--')) {
                continue;
            }
            $parts[] = $key . ':' . $value;
        }

        return implode(';', $parts);
    }
}
