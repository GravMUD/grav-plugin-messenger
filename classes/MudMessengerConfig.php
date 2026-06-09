<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Config\Config;

/**
 * Config accessor — plugins.messenger with legacy grav-mud-messenger fallback.
 */
class MudMessengerConfig
{
    /** @param \Grav\Common\Grav|Config $source */
    public static function all($source): array
    {
        if (!is_object($source)) {
            return [];
        }

        if ($source instanceof Config) {
            $cfg = (array) $source->get('plugins.messenger', []);
            if ($cfg !== []) {
                return $cfg;
            }

            return (array) $source->get('plugins.grav-mud-messenger', []);
        }

        if (!isset($source['config'])) {
            return [];
        }

        $cfg = (array) $source['config']->get('plugins.messenger', []);
        if ($cfg !== []) {
            return $cfg;
        }

        return (array) $source['config']->get('plugins.grav-mud-messenger', []);
    }

    /** @param \Grav\Common\Grav|Config $source */
    /** @param mixed $default */
    public static function get($source, string $key, $default = null)
    {
        $cfg = self::all($source);

        return array_key_exists($key, $cfg) ? $cfg[$key] : $default;
    }

    /** @param \Grav\Common\Grav $grav */
    public static function isEnabled($grav): bool
    {
        return (bool) self::get($grav, 'enabled', false);
    }

    /** @param \Grav\Common\Grav $grav */
    public static function configPath($grav): string
    {
        $locator = $grav['locator'];
        $preferred = $locator->findResource('user://config/plugins/messenger.yaml', true, true);
        if (is_file($preferred)) {
            return $preferred;
        }

        $legacy = $locator->findResource('user://config/plugins/grav-mud-messenger.yaml', true, true);
        if (is_file($legacy)) {
            return $legacy;
        }

        return $preferred;
    }

    /** @param \Grav\Common\Grav $grav */
    public static function writeConfigPath($grav): string
    {
        return $grav['locator']->findResource('user://config/plugins/messenger.yaml', true, true);
    }
}
