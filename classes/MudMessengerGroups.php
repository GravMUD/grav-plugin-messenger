<?php

declare(strict_types=1);

require_once __DIR__ . '/MudMessengerConfig.php';
use RocketTheme\Toolbox\File\YamlFile;

/**
 * Upsert chat groups into user config (Eventz wire-ins, admin API, etc.).
 */
class MudMessengerGroups
{
    public static function upsert(
        Grav $grav,
        string $groupId,
        string $title,
        string $description = '',
        string $emoji = '📅'
    ): bool {
        $groupId = self::normalizeId($groupId);
        if ($groupId === '') {
            return false;
        }

        $file = self::configPath($grav);
        if ($file === '') {
            return false;
        }

        $data = is_file($file)
            ? (array) (YamlFile::instance($file)->content() ?: [])
            : MudMessengerConfig::all($grav);

        if (!isset($data['groups']) || !is_array($data['groups'])) {
            $data['groups'] = [];
        }

        if (isset($data['groups'][$groupId]) && is_array($data['groups'][$groupId])) {
            self::reloadConfig($grav, $data);

            return true;
        }

        $data['groups'][$groupId] = [
            'title' => trim($title) !== '' ? trim($title) : $groupId,
            'emoji' => $emoji !== '' ? $emoji : '📅',
            'description' => trim($description),
        ];

        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        YamlFile::instance($file)->save($data);
        self::reloadConfig($grav, $data);

        return true;
    }

    public static function normalizeId(string $id): string
    {
        $id = strtolower(trim($id));
        $id = preg_replace('/[^a-z0-9_-]/', '', $id) ?? '';

        return substr($id, 0, 48);
    }

    private static function configPath(Grav $grav): string
    {
        return MudMessengerConfig::writeConfigPath($grav);
    }

    /** @param array<string, mixed> $data */
    private static function reloadConfig(Grav $grav, array $data): void
    {
        $grav['config']->reload();
        $grav['config']->set('plugins.messenger', array_merge(
            MudMessengerConfig::all($grav),
            $data
        ));
    }
}
