# LANStreamer Documentation

LANStreamer is an **Electron desktop app in active development** — most people will install the packaged app; it also runs straight from this repo for contributors and source users. Documentation below is split the same way. Current status: no installer released yet — see the status block in the [main README](../README.md).

## 📦 Using the app

| Document | Description |
|----------|-------------|
| **[../README.md](../README.md)** | Start here — quick start (desktop app or source), admin login, telemetry & privacy |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues — subnet, firewall, playback (plus the in-app guide at `/docs`) |
| **[NETWORK-SETUP.md](./NETWORK-SETUP.md)** | Static-IP setup for events and conferences |
| **[LATENCY.md](./LATENCY.md)** | Where audio delay comes from and how to cut it |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes |
| **[manual-setup/](../manual-setup/)** | Hardware-specific guides (Behringer DVS, XR18, and friends) |
| **[guides/](./guides/)** | FFmpeg / Icecast installation — **packaged app: not needed (binaries are bundled)**; source/server-only installs: required |

## 🛠️ Developing & running from source

| Document | Description |
|----------|-------------|
| **[README-DEVELOPERS.md](./README-DEVELOPERS.md)** | ⭐ Start here — dev loop (`electron:dev`), tests, architecture notes, UI rules, telemetry internals |
| **[GO-LIVE-CHECKLIST.md](./GO-LIVE-CHECKLIST.md)** | Pre-release checklist — test matrix, packaging, security blockers, GitHub release process |
| **[APP-FLOW.md](./APP-FLOW.md)** | Every page, user flow (mermaid), and component — the UI map |
| **[pressure-checklist.md](./pressure-checklist.md)** | PR review gate for streaming-behavior changes |
| **[UX-AUDIT-2026-10.md](./UX-AUDIT-2026-10.md)** | Holistic UX assessment (IxDF framework) — scores, prioritized issues, redesign roadmap |
| **[benchmark-report-v1.md](./benchmark-report-v1.md)** | Performance baseline (kept current until the latency round lands v2) |
| **[../CLAUDE.md](../CLAUDE.md)** | Code conventions for AI-assisted contributors |

```bash
npm install                # dependencies
npm run electron:dev       # the DESKTOP APP (what users run)
npm run dev                # server-only (no Electron shell) → http://localhost:3001
npm test                   # Jest suite
```

Dashboard login: `admin` / `lanstreamer123` by default (README → Security Setup).

## 🗄️ Archive

Superseded docs (pre-Electron architecture, shipped redesign plans, old test plans) live in **[archive/](./archive/)** with an index stating what replaced each one.
