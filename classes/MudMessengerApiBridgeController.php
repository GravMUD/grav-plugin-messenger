<?php

declare(strict_types=1);

namespace Grav\Plugin\Messenger;

use Grav\Common\Config\Config;
use Grav\Common\Grav;
use Grav\Common\User\Interfaces\UserInterface;
use Grav\Framework\Psr7\Response;
use Grav\Plugin\Api\Auth\ApiKeyAuthenticator;
use Grav\Plugin\Api\Auth\JwtAuthenticator;
use Grav\Plugin\Api\Auth\SessionAuthenticator;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class MudMessengerApiBridgeController
{
    public function __construct(
        protected readonly Grav $grav,
        protected readonly Config $config,
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if ($request->getMethod() === 'OPTIONS') {
            return new Response(204, ['Access-Control-Allow-Origin' => '*']);
        }

        $_SERVER['REQUEST_METHOD'] = $request->getMethod();

        parse_str($request->getUri()->getQuery(), $query);
        foreach ($query as $key => $value) {
            if (is_string($key)) {
                $_GET[$key] = $value;
            }
        }

        $params = $request->getAttribute('route_params', []);
        $action = isset($params['subpath']) ? trim((string) $params['subpath'], '/') : '';

        require_once __DIR__ . '/MudMessenger.php';
        $messenger = new MudMessenger($this->grav);
        $messenger->setBridgeMode(true);
        $apiUser = $this->optionalApiUser($request) ?? $this->mambersSiteUser();
        if ($apiUser !== null) {
            $messenger->setApiUser($apiUser);
        }

        $parsed = $request->getParsedBody();
        if (is_array($parsed)) {
            $messenger->setJsonBodyOverride($parsed);
        } else {
            $raw = (string) $request->getBody();
            if ($raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $messenger->setJsonBodyOverride($decoded);
                }
            }
        }

        $level = ob_get_level();
        ob_start();
        try {
            $messenger->handle($action);
        } finally {
            $output = (string) ob_get_clean();
            while (ob_get_level() > $level) {
                ob_end_clean();
            }
        }

        $code = $messenger->getBridgeHttpCode();
        if ($output === '') {
            return new Response($code >= 400 ? $code : 204, ['Access-Control-Allow-Origin' => '*']);
        }

        return new Response($code, [
            'Content-Type' => 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin' => '*',
            'X-Content-Type-Options' => 'nosniff',
        ], $output);
    }

    private function optionalApiUser(ServerRequestInterface $request): ?UserInterface
    {
        if ($request->getHeaderLine('X-API-Token') === ''
            && !str_starts_with($request->getHeaderLine('Authorization'), 'Bearer ')) {
            return null;
        }

        $authenticators = [];
        if ($this->config->get('plugins.api.auth.api_keys_enabled', true)) {
            $authenticators[] = new ApiKeyAuthenticator($this->grav);
        }
        if ($this->config->get('plugins.api.auth.jwt_enabled', true)) {
            $authenticators[] = new JwtAuthenticator($this->grav, $this->config);
        }
        if ($this->config->get('plugins.api.auth.session_enabled', true)) {
            $authenticators[] = new SessionAuthenticator($this->grav);
        }

        foreach ($authenticators as $authenticator) {
            $user = $authenticator->authenticate($request);
            if ($user !== null) {
                return $user;
            }
        }

        return null;
    }

    private function mambersSiteUser(): ?UserInterface
    {
        require_once __DIR__ . '/MudMessengerMambersBridge.php';

        return MudMessengerMambersBridge::siteUser($this->grav);
    }
}
