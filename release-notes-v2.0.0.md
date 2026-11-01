# LANStreamer v2.0.0 — the desktop app

The first packaged release: LANStreamer is now a full Windows desktop app that turns any PC into a multi-channel audio streaming server for your local network — built for language interpretation at events, meetings, and conferences. Listeners open a link on their phones; nothing to install on their side.

## What's new in 2.0.0

- **Desktop app** — dashboard window with tray icon; minimize to tray keeps streams running for listeners; a real Exit that cleanly stops everything (with confirmation when streams are live).
- **Nothing to pre-install** — the app bundles FFmpeg and Icecast. Download, run, stream.
- **Low-latency playback** — listener delay cut from 4–5 seconds to about 1 second (a low-latency player with a small live-edge buffer; details in docs/LATENCY.md).
- **Admin login** — dashboard protected by username/password, locked to the operator's PC (the network only ever sees the listener page). Remember-me keeps you signed in; recovery path documented if you forget your password.
- **Full redesign** — new operator dashboard (status strip, stream rows with quick actions) and listener page (big play button, channel picker, QR sharing), light/dark themes, fully offline.
- **Audio bitrate control** — default 96 kbps (plenty for speech), switchable per stream to 128/192 for music; live streams restart instantly at the new setting.
- **Event banner** — your own artwork with a bundled default; click to view full-size.
- **Anonymous telemetry, ON by default** — simple usage events (app start/stop, stream started/stopped/failed, version, OS) help improve the app. No audio, no personal data, listeners' phones never send anything. Turn it off anytime: dashboard → Admin account → the switch, or the tray menu.

## Installing

- **`LANStreamer Setup 2.0.0.exe`** — installer (Start-menu entry, uninstaller).
- **`LANStreamer Standalone 2.0.0.exe`** — single-file build; run it from anywhere, no installation.

Both are unsigned (SmartScreen will warn — "More info → Run again"/"Run anyway"); verify downloads against `SHA256SUMS.txt` if in doubt. Windows 10/11 64-bit. Listeners: any phone/PC with a browser on the same network.

**Upgrading from a source/ZIP install:** your stream configuration lives in `config/` there; the packaged app keeps its own in `%APPDATA%\LANStreamer` — set your streams up once in the app.

## Known issues

- macOS/Linux: run from source (Windows is the packaged platform).
- Unsigned installer: expect the SmartScreen warning until the build gains reputation.
- The public Wi-Fi caveat: networks marked "Public" by Windows silently block inbound connections — set the network profile to Private if listeners can't connect.

## Licenses

LANStreamer is MIT. The bundles include GPL-licensed binaries — FFmpeg (gyan.dev essentials build) and Icecast 2.5.0 — whose license texts and source-offer ship inside the app (`resources\vendor\licenses\`). Source code: https://github.com/jerryagenyi/LANStreamer
