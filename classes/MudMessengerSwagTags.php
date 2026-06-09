<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Grav;
use Grav\Common\User\Interfaces\UserInterface;

/**
 * Admin-configured :swag-tag: shortcodes resolved against swag-store catalog.json.
 */
class MudMessengerSwagTags
{
    public function __construct(private readonly Grav $grav) {}

    /** @return array{ok: bool, tags: list<array<string, mixed>>} */
    public function listTags(?UserInterface $apiUser = null): array
    {
        if (!(bool) MudMessengerConfig::get($this->grav, 'swag_tags_enabled', false)) {
            return ['ok' => true, 'tags' => []];
        }

        if (!$this->canUseSwagTags($apiUser)) {
            return ['ok' => true, 'tags' => []];
        }

        $productsById = $this->productsById();
        $configured = MudMessengerConfig::get($this->grav, 'swag_tags');
        if (!is_array($configured)) {
            return ['ok' => true, 'tags' => []];
        }

        $tags = [];
        foreach ($configured as $row) {
            if (!is_array($row)) {
                continue;
            }
            $tag = self::normalizeTag((string) ($row['tag'] ?? ''));
            $productId = trim((string) ($row['product_id'] ?? ''));
            if ($tag === '' || $productId === '') {
                continue;
            }
            $product = $productsById[$productId] ?? null;
            if (!is_array($product)) {
                continue;
            }
            $image = trim((string) ($product['image'] ?? ''));
            if ($image === '' && !empty($product['images'][0])) {
                $image = (string) $product['images'][0];
            }
            if ($image === '') {
                continue;
            }

            $tags[] = [
                'tag' => $tag,
                'productId' => $productId,
                'title' => (string) ($product['title'] ?? 'Product'),
                'image' => $image,
                'buyUrl' => (string) ($product['buyUrl'] ?? ''),
                'priceLabel' => (string) ($product['priceLabel'] ?? ''),
            ];
        }

        return ['ok' => true, 'tags' => $tags];
    }

    public function assertCanPostSwagInBody(
        string $body,
        ?UserInterface $apiUser = null,
        string $author = '',
        string $modKey = ''
    ): void {
        if (!$this->bodyContainsSwagTag($body)) {
            return;
        }

        if ($this->canUseSwagTags($apiUser, $author, $modKey)) {
            return;
        }

        throw new \InvalidArgumentException('Swag tags are for admins and moderators only.');
    }

    public function bodyContainsSwagTag(string $body): bool
    {
        if (!preg_match_all('/:([a-z0-9-]+):/i', $body, $matches)) {
            return false;
        }

        $productsById = $this->productsById();
        $configured = MudMessengerConfig::get($this->grav, 'swag_tags');
        if (!is_array($configured)) {
            return false;
        }

        $known = [];
        foreach ($configured as $row) {
            if (!is_array($row)) {
                continue;
            }
            $tag = self::normalizeTag((string) ($row['tag'] ?? ''));
            if ($tag !== '') {
                $known[$tag] = true;
            }
        }

        foreach ($matches[1] as $slug) {
            $tag = self::normalizeTag((string) $slug);
            if ($tag !== '' && isset($known[$tag])) {
                return true;
            }
        }

        return false;
    }

    public function canUseSwagTags(
        ?UserInterface $apiUser = null,
        string $author = '',
        string $modKey = ''
    ): bool {
        if (!(bool) MudMessengerConfig::get($this->grav, 'swag_tags_enabled', false)) {
            return false;
        }

        if ((MudMessengerConfig::get($this->grav, 'swag_tags_mod_only') ?? true) === false) {
            return true;
        }

        if ($apiUser !== null) {
            require_once __DIR__ . '/MudMessengerIdentity.php';
            $identity = new MudMessengerIdentity($this->grav);
            $role = $identity->roleForUser($apiUser);
            if (in_array($role, ['admin', 'mod'], true)) {
                return true;
            }
            if ($identity->moderatorPermissionsForUser($apiUser) !== null) {
                return true;
            }
        }

        if ($author !== '' && $modKey !== '') {
            require_once __DIR__ . '/MudMessengerModeration.php';
            $moderation = new MudMessengerModeration($this->grav);
            if ($moderation->verifyModerator($author, $modKey) !== null) {
                return true;
            }
        }

        return false;
    }

    public static function normalizeTag(string $tag): string
    {
        $tag = strtolower(trim($tag));
        $tag = preg_replace('/^:+|:+$/', '', $tag) ?? $tag;

        return preg_replace('/[^a-z0-9-]/', '', $tag) ?? '';
    }

    /** @return array<string, array<string, mixed>> */
    private function productsById(): array
    {
        $path = GRAV_ROOT . '/user/data/swag-store/catalog.json';
        if (!is_file($path)) {
            return [];
        }

        $raw = file_get_contents($path);
        if ($raw === false) {
            return [];
        }

        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['products']) || !is_array($data['products'])) {
            return [];
        }

        $map = [];
        foreach ($data['products'] as $product) {
            if (!is_array($product)) {
                continue;
            }
            $id = trim((string) ($product['id'] ?? ''));
            if ($id !== '') {
                $map[$id] = $product;
            }
        }

        return $map;
    }
}
