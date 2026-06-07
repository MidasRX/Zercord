<div align="center">

# 🔮 Zercord

### *A premium fork of [Vencord](https://github.com/Vendicated/Vencord) — built different.*

[![GitHub Stars](https://img.shields.io/github/stars/MidasRX/Zercord?style=for-the-badge&logo=github&color=6e40c9&labelColor=1a1a2e)](https://github.com/MidasRX/Zercord)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge&labelColor=1a1a2e&color=6e40c9)](LICENSE)

<br/>

> **Zercord** takes everything great about Vencord and pushes it further — exclusive plugins, enhanced privacy, and a vision for a fully rebranded Discord experience.

</div>

---

## ✨ What Makes Zercord Different

| Feature | Status |
|---------|--------|
| 🎭 **FakeVoice** — Appear muted/deafened while still transmitting audio | ✅ Included |
| 👻 **Ghosted** — Track who's ghosting your DMs with visual indicators | ✅ Included |
| 🔇 **IgnoredTroll** — Replace ignored users' messages with troll text + block their calls | ✅ Included |
| 🎙️ **VoiceChatUtilities** — Mass mute/deafen/disconnect/move entire voice channels | ✅ Included |
| 🔔 **BypassStatus** — Get notifications from whitelisted sources while in DND | ✅ Included |
| 🖥️ **LimitlessScreenshare** — Custom resolution & FPS sliders, bypass Nitro limits | ✅ Included |
| 🔐 **End-to-End Encryption** — Encrypted DMs & group chats | 🔜 Coming Soon |
| 🎨 **Full Discord Rebrand** — Custom UI theme, redesigned components | 🔜 Coming Soon |

Plus all **100+ original Vencord plugins** included out of the box.

---

## 🚀 Installation

```bash
git clone https://github.com/MidasRX/Zercord
cd Zercord
npm install -g pnpm
pnpm install
pnpm build
pnpm inject
```

Then **restart Discord** completely.

---

## 🔌 Plugin-Only Install (for existing Vencord users)

Already have Vencord? Just grab the plugin folders from `src/plugins/` and drop them into your `src/userplugins/` directory:

```
src/userplugins/fakeVoice/
src/userplugins/ignoredTroll/
src/userplugins/ghosted/
src/userplugins/voiceChatUtils/
src/userplugins/bypassStatus/
src/userplugins/limitlessScreenshare/
```

Then `pnpm build && pnpm inject` and restart Discord.

---

## 🛡️ Privacy & Security

- Blocks Discord analytics & crash reporting out of the box
- Zero telemetry from Zercord
- **End-to-end encryption module** coming soon for truly private conversations
- No data collection, no tracking, no bullshit

---

## 📋 Roadmap

- [x] Exclusive plugin suite (FakeVoice, Ghosted, IgnoredTroll, VoiceChatUtils, BypassStatus, LimitlessScreenshare)
- [ ] 🔐 E2E Encryption for DMs and group chats
- [ ] 🎨 Full Discord visual rebrand (custom theme engine)
- [ ] 📦 Zercord Installer (one-click setup)
- [ ] 📱 Mobile support investigation

---

## ⚖️ Credits

Zercord is built on top of [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors.
Additional plugins adapted from the community. All original licenses respected.

---

## ⚠️ Disclaimer

Discord is a trademark of Discord Inc. Zercord is not affiliated with, endorsed by, or connected to Discord Inc. in any way. Using client modifications may violate Discord's Terms of Service. Use at your own risk.
