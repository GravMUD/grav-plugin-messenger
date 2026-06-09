<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;

final class MudMessengerGiphy
{
    /** @var list<string> */
    private const ALLOWED_HOSTS = [
        'media.giphy.com',
        'media0.giphy.com',
        'media1.giphy.com',
        'media2.giphy.com',
        'media3.giphy.com',
        'media4.giphy.com',
        'i.giphy.com',
    ];

    public static function assertAllowedUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            throw new \InvalidArgumentException('Giphy URL required.');
        }

        $parts = parse_url($url);
        if (!is_array($parts)) {
            throw new \InvalidArgumentException('Invalid Giphy URL.');
        }

        if (strtolower((string) ($parts['scheme'] ?? '')) !== 'https') {
            throw new \InvalidArgumentException('Giphy URL must use HTTPS.');
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if (!in_array($host, self::ALLOWED_HOSTS, true)) {
            throw new \InvalidArgumentException('Giphy URL host not allowed.');
        }

        return $url;
    }

    public static function assertRateLimit(Grav $grav): void
    {
        require_once __DIR__ . '/MudMessengerData.php';

        $ip = substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
        $file = MudMessengerData::dir($grav, 'rate-limits') . '/giphy-' . hash('sha256', $ip) . '.json';
        $now = time();
        $window = 60;
        $max = 30;

        $data = ['count' => 0, 'since' => $now];
        if (is_file($file)) {
            $raw = file_get_contents($file);
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            if (is_array($decoded)) {
                $data = $decoded;
            }
        }

        $since = (int) ($data['since'] ?? $now);
        $count = (int) ($data['count'] ?? 0);
        if ($now - $since >= $window) {
            $since = $now;
            $count = 0;
        }

        if ($count >= $max) {
            throw new \InvalidArgumentException('Giphy rate limit exceeded — try again shortly.');
        }

        $data = ['count' => $count + 1, 'since' => $since];
        file_put_contents($file, json_encode($data, JSON_UNESCAPED_SLASHES), LOCK_EX);
    }
}
