# GravFans Messenger

**Site:** [messenger.gravmud.site](https://messenger.gravmud.site) · **Repo:** [GravMUD/grav-plugin-messenger](https://github.com/GravMUD/grav-plugin-messenger)

Flat-file **community chat** for Grav 2.0 — float bubble, groups, Giphy, swag tags, Paint Shop theming, Admin2 cockpit. **Lite** is MIT forever; **Pro** adds moderation + form builder.

> *Discord who? Village chat on cPanel. Groundswell not fork.*

**Edition:** Lite (MIT) · Pro (commercial, mod + forms)  
**License:** MIT — Lite is free forever.

---

## Requirements

| Package | Version |
|---------|---------|
| [Grav](https://github.com/getgrav/grav) | `>=2.0.0` |
| [Admin2](https://github.com/getgrav/grav-plugin-admin2) | `>=1.0.0` (recommended) |
| [API](https://github.com/getgrav/grav-plugin-api) | `>=1.0.0` (recommended) |

Optional: **swag-store** for `:swag-tag:` Printify thumbnails · **eventz** for auto chat groups on event save · **grav-mud-alpha** for `.mud` fence embeds only.

---

## Installation

```bash
bin/gpm direct-install https://github.com/GravMUD/grav-plugin-messenger/releases/download/0.3.0/grav-plugin-messenger.zip
bin/grav cache
```

Once listed in GPM:

```bash
bin/gpm install messenger
bin/grav cache
```

Enable **Messenger** in Admin2 → Plugins.

### Upgrade from 0.2.x (two-plugin install)

1. Remove `grav-mud-messenger` + the old thin `messenger` shell.
2. Install one **messenger** package (v0.3.0+).
3. Rename `user/config/plugins/grav-mud-messenger.yaml` → `messenger.yaml` (legacy key still read if you skip this).

Message data in `user/data/mud-messenger/` is unchanged.

---

## Lite vs Pro

| | **Lite** (default) | **Pro** |
|---|-------------------|---------|
| Float bubble + groups | ✅ | ✅ |
| Giphy picker | ✅ | ✅ |
| Swag `:tags:` (with swag-store) | ✅ | ✅ |
| Paint Shop / JavaBean presets | ✅ | ✅ |
| Moderation (edit/delete/warn/boot/ban) | — | ✅ |
| Form builder (survey/lead/booking) | — | ✅ |
| PM / voice / video | — | roadmap |

Set `edition: pro` in config + enable mod/forms toggles. License key validation ships with The Mud Bazaar later — today Pro is config-gated.

---

## Configuration

`user/config/plugins/messenger.yaml`:

```yaml
enabled: true
edition: lite
api_route: api/mud-messenger
float_bubble: true
default_group: general
giphy_enabled: true
giphy_api_key: ''          # from developers.giphy.com — server-side proxy
swag_tags_enabled: true    # Lite — pairs with swag-store catalog
groups:
  general:
    title: General
    emoji: "💬"
    description: Site-wide hangout
```

**Admin2 → Messenger** — Paint Shop, groups, Giphy key, swag tags, live preview, admin cockpit bubble.

**Pro only:** Moderation tab (mod keys + permissions), Form builder tab.

Admin2 sidebar + page registration use runtime API hooks only — **no writes to `admin-next.yaml`**.

---

## Giphy setup

1. Create an app at [developers.giphy.com](https://developers.giphy.com/).
2. Copy your **API key**.
3. Admin2 → **Messenger** → Integrations → paste key → save.

The key is stored in site config and proxied server-side — never exposed to browsers.

---

## Swag tags (Lite)

Requires [swag-store](https://github.com/GravMUD/grav-plugin-swag-store) with synced Printify catalog.

1. Sync catalog in Admin2 → Swag Store.
2. Messenger → Integrations → add tag rows (`getgrav-tee` → product id from `catalog.json`).
3. In chat, mods insert `:getgrav-tee:` — thumbnail + shop link for everyone.

---

## Public API

Default prefix: `/api/mud-messenger`  
Grav 2 bridge: `/api/v1/mud-messenger/...` when API plugin enabled.

| Route | Purpose |
|-------|---------|
| `GET /groups` | List configured groups |
| `GET /messages/{group}` | Poll messages |
| `GET /stream/{group}` | SSE realtime |
| `POST /messages/{group}` | Post message (nick auth) |
| `GET /giphy/search?q=` | GIF search (when enabled) |

Admin cockpit routes under `/api/v1/messenger/admin/*`.

---

## Storage

```
user/data/mud-messenger/
  messages/{group}.json
  forms/                    # Pro form responses
  bans.json                 # Pro moderation
```

Flat-file JSON — mortal-host friendly, git-friendly.

---

## Links

- Landing: https://messenger.gravmud.site
- Discussions: https://github.com/GravMUD/grav-plugin-messenger/discussions
- Eventz: https://github.com/GravMUD/grav-plugin-eventz
- Swag Store: https://github.com/GravMUD/grav-plugin-swag-store
- GravFans.Live: https://gravfans.live

---

MIT · FutureVision Labs · Team DC · groundswell not fork
