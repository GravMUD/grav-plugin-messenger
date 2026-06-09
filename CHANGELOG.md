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
