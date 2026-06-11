<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;
use Grav\Common\User\Interfaces\UserInterface;

/**
 * Optional Mambers identity bridge — Messenger detects Mambers Lite/Pro without a hard plugin dependency.
 */
class MudMessengerMambersBridge
{
    public static function isInstalled(Grav $grav): bool
    {
        if (class_exists(\Grav\Plugin\MambersPlugin::class)) {
            return true;
        }

        $locator = $grav['locator'];
        $mambers = $locator->findResource('plugins://mambers', true);
        if (is_string($mambers) && is_dir($mambers)) {
            return true;
        }

        $legacy = $locator->findResource('plugins://grav-mud-mambers', true);

        return is_string($legacy) && is_dir($legacy);
    }

    public static function isEnabled(Grav $grav): bool
    {
        if (!self::isInstalled($grav)) {
            return false;
        }

        $config = $grav['config'];
        if ($config->get('plugins.mambers.enabled') === false) {
            return false;
        }
        if ($config->get('plugins.grav-mud-mambers.enabled') === false) {
            return false;
        }

        return true;
    }

    public static function identityBridgeEnabled(Grav $grav): bool
    {
        if (!self::isEnabled($grav)) {
            return false;
        }

        $cfg = self::mambersConfig($grav);

        return ($cfg['messenger_identity_bridge'] ?? true) !== false;
    }

    public static function isPro(Grav $grav): bool
    {
        return (self::mambersConfig($grav)['edition'] ?? 'lite') === 'pro';
    }

    public static function siteUser(Grav $grav): ?UserInterface
    {
        if (!self::identityBridgeEnabled($grav)) {
            return null;
        }

        $user = $grav['user'] ?? null;
        if (!$user instanceof UserInterface || !$user->exists()) {
            return null;
        }

        if (trim((string) ($user->get('username') ?? '')) === '') {
            return null;
        }

        if (method_exists($user, 'authorize') && !$user->authorize('site.login')) {
            return null;
        }

        return $user;
    }

    /** @return array<string, mixed> */
    private static function mambersConfig(Grav $grav): array
    {
        $cfg = (array) $grav['config']->get('plugins.mambers', []);
        if ($cfg !== []) {
            return $cfg;
        }

        return (array) $grav['config']->get('plugins.grav-mud-mambers', []);
    }
}
