I would like to add my new plugin to the Grav Repository.

**Repository:** https://github.com/GravMUD/grav-plugin-messenger
**Release:** https://github.com/GravMUD/grav-plugin-messenger/releases/tag/0.3.0
**Direct install:** https://github.com/GravMUD/grav-plugin-messenger/releases/download/0.3.0/grav-plugin-messenger.zip
**Plugin name:** GravFans Messenger
**Plugin slug:** messenger
**License:** MIT (Lite edition)
**Grav target:** Grav 2.0 / Admin2
**Site / docs:** https://messenger.gravmud.site
**Discussions:** https://github.com/GravMUD/grav-plugin-messenger/discussions

---

## Summary

**GravFans Messenger** is flat-file community chat for Grav 2.0 — float bubble, groups, Giphy, swag tags, Paint Shop theming, Admin2 cockpit, SSE/poll realtime, optional Eventz wire-ins. **Single plugin** (v0.3.0 merged engine + Admin2 page). Admin2 sidebar via runtime API hooks only — **does not write `admin-next.yaml`**.

**Lite (MIT):** chat, Giphy, swag tags, unlimited groups, Paint Shop.  
**Pro (commercial roadmap):** moderation + form builder — config-gated today; license keys with The Mud Bazaar later.

Not Discord cosplay. Works on any Grav 2 site — not MUD-specific.

---

## Dependencies

- grav >= 2.0.0
- admin2 >= 1.0.0
- api >= 1.0.0

Optional: swag-store (`:tag:` thumbnails), eventz (auto chat groups on event save).

---

## Suggested maintainer test plan (~10 min)

```bash
bin/gpm direct-install https://github.com/GravMUD/grav-plugin-messenger/releases/download/0.3.0/grav-plugin-messenger.zip
bin/grav cache
```

1. Confirm `user/plugins/messenger` exists (one folder only).
2. Enable in Admin2 → Plugins.
3. Admin2 → **Messenger** page loads (Paint Shop / groups UI).
4. Public site shows float chat bubble (when `float_bubble: true`).
5. `GET /api/v1/mud-messenger/groups` returns JSON when API plugin enabled.

Live reference: https://messenger.gravmud.site · https://gravfans.live

*(Giphy search test optional — requires maintainer's own API key.)*

---

## GPM checklist

- [x] MIT LICENSE
- [x] README.md with install + Giphy + Lite/Pro tiers
- [x] blueprints.yaml (semver **0.3.0**, slug **messenger**)
- [x] CHANGELOG.md (Grav format)
- [x] Semver GitHub release with zip asset
- [x] Docs site + CNAME (messenger.gravmud.site)
- [x] Good Grav citizen — no `admin-next.yaml` writes

---

## Install (once listed)

```bash
bin/gpm install messenger
```

Please list **one slug: `messenger`** only (repo `grav-plugin-messenger`, not `grav-plugin-grav-mud-messenger`).

Pairs with [Eventz](https://github.com/getgrav/grav/issues/4116), [Swag Store](https://github.com/getgrav/grav/issues/4117), and [JavaBean for Admin2](https://github.com/getgrav/grav/issues/4100) in the Team DC / Grav Social Stack.

Happy to adjust anything for the index. Thanks Andy!

— Damian Caynes · FutureVision Labs · chief@gravmud.site
