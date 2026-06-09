<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;

final class MudMessengerData
{
    public static function dir(Grav $grav, string $subdir = ''): string
    {
        $base = $grav['locator']->findResource('user-data://messenger', true, true);
        $dir = rtrim($base, '/\\');
        if ($subdir !== '') {
            $dir .= '/' . trim($subdir, '/');
        }
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        return $dir;
    }
}
