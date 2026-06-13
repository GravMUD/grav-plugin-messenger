# v0.3.6
## 06/12/2026

1. [](#bugfix)
    * **Grav API `/api/v1/*` 500 on RC5 deploys** — public JSON served at `/api/mud-messenger` via early `interceptPublicApi()` (bypasses broken Grav API router)
    * **Browser defaults** — `mud-messenger.js` + Twig `api_route` use legacy direct path, not `/api/v1/mud-messenger`

# v0.3.5
## 06/11/2026

1. [](#bugfix)
    * **Grav 2 RC5 Mambers bridge** — `MudMessengerMambersBridge::siteUser()` and `MudMessengerIdentity` read `username` / `fullname` via `get()` (fixes `User::username()` fatals when Mambers identity bridge runs on logged-in page loads)

# v0.3.4
## 06/05/2026

1. [](#bugfix)
    * **Mambers bridge boot** — `messenger.php` imports `MudMessengerMambersBridge` + `MudMessengerIdentity` in `Grav\Plugin\Messenger` namespace (fixes `Class "Grav\Plugin\MudMessengerMambersBridge" not found` on sites with Mambers identity bridge enabled)

# v0.3.3
## 06/05/2026

1. [](#security)
    * **Public posts** — guests cannot forge `type=system` or `type=form` messages
    * **Secrets** — settings panel uses redacting `/messenger/admin/config`; `giphy_api_key` + `mod_key` masked on read, password fields in blueprint
    * **SVG uploads** — removed from thread-background allowlist
    * **Mod key** — `POST /mod/session` JSON body (not query string)
    * **Giphy proxy** — per-IP rate limit; stored GIF URLs restricted to Giphy HTTPS hosts
2. [](#improved)
    * **Polling only** — removed dead SSE/stream path (was unreachable via API bridge + FPM hazard)
    * **Data path** — `user-data://messenger/` via locator
    * **GPM manifest** — `compatibility.grav: ['2.0']` only; plugin ships disabled with neutral footer defaults
    * Unconditional `onApi*` registration; removed legacy no-API fallback engine

# v0.3.2
## 06/09/2026

1. [](#bugfix)
    * **Production boot fix:** register PSR-4 autoload for `Grav\Plugin\Messenger\` — fixes `MudMessengerConfig` not found on Linux/cPanel when plugin classes were never required before use

# v0.3.1
## 06/05/2026

1. [](#new)
    * **Mambers Lite identity bridge** — when Mambers is installed, logged-in members get locked chat nicks via Grav Login (fullname or username)
    * `GET /api/v1/mud-messenger/identity/session` for session refresh after login
2. [](#improved)
    * Mambers Pro maps `site.member.moderator` → Messenger mod permissions when both plugins are present

# v0.3.0
## 06/09/2026

1. [](#improved)
    * **Single plugin** — merged `grav-mud-messenger` engine + `messenger` Admin2 shell into one `messenger` package
    * Config key `plugins.messenger` (reads legacy `plugins.grav-mud-messenger` if present)
    * GPM repo target `grav-plugin-messenger` (one zip, one slug)
    * **Honest tiers:** Lite = chat, Giphy, swag tags, Paint Shop · Pro = moderation + form builder (gated in code)
    * Shipped defaults: `edition: lite`, swag tags on (Lite feature per tier canon)
2. [](#bugfix)
    * Blueprint labels aligned — swag tags marked Lite, not Pro
    * Admin settings + config file use `messenger` slug consistently

# v0.2.0
## 05/2026

1. [](#new)
    * Float bubble, groups, Giphy, swag tags, Paint Shop, moderation, forms
    * Admin2 cockpit + MCP wire-ins
