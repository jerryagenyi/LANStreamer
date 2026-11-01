# LANStreamer

**LAN audio streaming for language interpretation, meetings, and events.** LANStreamer is a desktop app that turns an ordinary PC into a multi-channel audio streaming server for your local network (LAN) — it orchestrates **FFmpeg** and **Icecast** behind the scenes, so a whole room can listen to live, low-latency audio on their phones.

> **Status: v2.0.0 is released** — download from [GitHub Releases](https://github.com/jerryagenyi/LANStreamer/releases). Running from source still works: `npm run electron:dev`, or the server-only `Start LANStreamer Server.bat`. Release process and pre-ship checks: [docs/GO-LIVE-CHECKLIST.md](docs/GO-LIVE-CHECKLIST.md).

**Highlights**

- **One download, nothing to pre-install** — the app bundles FFmpeg + Icecast. Two builds: `Setup` (installer) and `Standalone` (single file, run from anywhere).
- **Listeners just open a link** — any phone/PC browser on the same network; QR code included; no app, no account.
- **~1 second listener latency** — a low-latency player keeps live audio close behind the room ([how](docs/LATENCY.md)).
- **Multi-channel** — one stream per language/channel; speech-friendly 96 kbps default, 128/192 for music, switchable per stream.
- **Admin login, LAN-safe by design** — the dashboard is locked to the operator's PC; the network only ever sees the listener page.
- **Event-ready extras** — event banner, listener QR sharing, light/dark themes, fully offline after install, telemetry you can turn off with one switch.

---

## 🎯 What is LANStreamer?

Think "wireless interpretation booth": the interpreter's PC captures audio (microphone, audio interface, or virtual audio cable) and broadcasts it over Wi-Fi. Anyone on the same network opens a link in their browser and listens — nothing to install.

### Interfaces

| Interface | Purpose | Access |
|-----------|---------|--------|
| **Admin Dashboard** | Control center for managing streams | The app window (or `http://localhost:3001/dashboard` on the operator PC) — login: `admin` / `lanstreamer123` by default |
| **Listener Interface** | User-friendly page for browsing and playing streams | `http://YOUR-PC-IP:3001/streams` (public, no login) |

### Use Cases

- **Language Interpretation**: Multiple language channels for conferences
- **Meeting Audio**: Professional audio distribution for events
- **Training Sessions**: Audio streaming for educational content
- **Local Broadcasting**: Any situation requiring reliable, low-latency audio distribution

---

## 🚀 Quick Start (Desktop App)

**Step 1: Launch LANStreamer**
Start the LANStreamer app on the operator PC — the **Standalone** build runs from anywhere, no installation. The dashboard window opens automatically; no terminal to babysit. Two buttons top-right run the app: **minimize** (hides to the tray — streams keep playing for your listeners; a balloon reminds you where it went) and the red **power button** (shuts LANStreamer down — it warns first if streams are live). Closing the window also just minimizes to the tray; quit from the tray icon → **Stop All & Quit**.

> No app package? You can run the same server from a source/ZIP copy: double-click `Start LANStreamer Server.bat` (requires [Node.js](https://nodejs.org/) LTS, plus FFmpeg & Icecast — see the [Installation Guides](docs/guides/README.md)). Building the desktop package from source is covered in the [Developer Guide](docs/README-DEVELOPERS.md).

**Step 2: Sign In**
The dashboard asks you to sign in when it opens.

- **Username**: `admin`
- **Password**: `lanstreamer123`

Leave **Remember me** checked (the default) and you won't be asked again on this PC — even after restarting the app. Change the login before your event — see [Security Setup](#-security-setup--admin-login) below.

**Step 3: Create a Stream**
Click **Add stream**, pick an audio source (your microphone, audio interface, or virtual audio cable), and click **Go live**. Quality defaults to **96 kbps — plenty for speech**; switch a stream to 128/192 for music anytime via its **Edit** dialog (a live stream restarts at the new bitrate automatically). Repeat for more channels (e.g. one per language), or use **Start All / Stop All**.

**Step 4: Share with Listeners**
The dashboard's **Share with listeners** card shows the listener link (e.g. `http://192.168.x.x:3001/streams`). Copy it, or tap the QR icon and let people scan it. Share it once — by chat, email, projector slide, or QR on paper.

---

## 🎧 For Listeners

1. Join the **same Wi-Fi/network** as the operator PC
2. Open the shared link (or scan the QR code) — no app, no account, no login
3. Tap the stream they want and press play

The listener page is forgiving: it **auto-resumes** a stream that drops and comes back on air (unless they paused it themselves), and on reload it remembers the stream they played last.

---

## 🔐 Security Setup — Admin Login

**Default admin credentials:**

| Setting | Value |
|---------|-------|
| Username | `admin` |
| Password | `lanstreamer123` |

Sign in in the app window (or at `http://localhost:3001/dashboard` from a browser on the operator PC) — the login appears automatically when the dashboard is opened. **Remember me** (default on) keeps you signed in for 30 days across app restarts; unchecked, the session lasts one day. The **listener page (`/streams`) has no login** — phones on the LAN just open the shared link.

**First run:** while the default credentials are active, the dashboard shows a banner stating them and how to change them — it disappears permanently once you set your own.

**Forgot your password?** On the operator PC, delete the admin login file and restart LANStreamer — the default login above returns, and you can set a new one from the dashboard (Admin account). Desktop app (installer or standalone): `%APPDATA%\LANStreamer\security.json` · running from source: `config\security.json`. (The login page carries this same hint with a **Forgot password?** link — it only opens on the operator's PC, so the path is safe to show there.)

Admin access has two layers:

1. **Login (username + password)** — every admin API call requires a session token from signing in.
2. **Localhost lock** — the dashboard and admin APIs refuse connections from other machines, so even someone on your LAN with the password cannot reach admin.

To change the defaults, use the in-app settings: dashboard → sidebar → **Admin account** card → enter the current password and a new username/password → **Update login**. It applies immediately (no restart), signs out every other session, and is stored in the app's data folder — this works in the packaged desktop app, where there is no `.env` to edit.

Running from source, `.env` also works — copy `env.example` to `.env`, then edit:

```env
ADMIN_USERNAME=your-new-username
ADMIN_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

Restart LANStreamer afterwards. (The in-app change takes precedence over `.env` values. Sessions last 30 days with Remember me, 1 day without — or set `JWT_EXPIRES_IN` when running from source.)

**Icecast (the streaming server LANStreamer drives) is hardened automatically when bundled.** The bundled Icecast binds to `127.0.0.1` only — listeners receive audio through LANStreamer's own play proxy on port 3001, so nothing about Icecast is ever exposed to your network — and its passwords are randomly generated per install (the app reads them itself; nobody ever types them). Someone who knows LANStreamer's defaults cannot reach or control it.

Using your **own Icecast install** instead of the bundled one? That install is on your network as you configured it: if it still has Icecast's stock default passwords, the dashboard shows a security warning until you change them (edit `icecast.xml` in the install folder, e.g. `C:\Program Files (x86)\Icecast\icecast.xml` — the `<authentication>` block — then restart LANStreamer).

---

## ⚙️ System Requirements

**Operator PC (minimum)**

| | Requirement |
|---|---|
| OS | Windows 10/11 64-bit (macOS/Linux run from source) |
| CPU / RAM | Dual-core, 4 GB RAM — one stream encodes at ~2–5% of a modern CPU |
| Disk | ~600 MB (app + bundled FFmpeg/Icecast) |
| Audio | Any input: built-in mic, USB interface, or virtual audio cable (e.g. VB-Cable) |
| Network | Wi-Fi or Ethernet to the same network as the listeners |
| Extras | **None** — FFmpeg + Icecast are bundled. Source installs: see the [guides](docs/guides/README.md) |

**Listeners:** any phone/PC with a browser and WiFi — nothing to install. Rule of thumb: ~20–25 listeners per consumer WiFi access point for stable audio; larger events should add access points.

**Recommended for bigger events:** 8 GB RAM for 4+ simultaneous streams, wired Ethernet from the operator PC to the router, 5 GHz WiFi for listeners (see the [Latency guide](docs/LATENCY.md)).

---

## 🛠️ Troubleshooting

**Common Issues:**

| Problem | Quick Fix |
|---------|-----------|
| Stream won't start | Make sure the audio device isn't already in use by another app; rescan devices in the dashboard |
| Listeners can't connect | Check everyone is on the **same Wi-Fi/network** as the operator PC, and the link uses the PC's LAN IP (not `localhost`). Also see [Firewall Issues](docs/TROUBLESHOOTING.md#firewall-issues) |
| "This site can't be reached" | Likely subnet mismatch — see [Network Troubleshooting](docs/TROUBLESHOOTING.md#network-connectivity-issues) |
| "Port 3001 already in use" | A leftover instance is running — quit it from the tray (Stop All & Quit) or the header power button, close any old terminal window, or end `LANStreamer.exe` (source runs: `node.exe`) in Task Manager, then relaunch. The app also warns you itself when it lands on a different port |
| "No audio devices detected" | Ensure device is connected and not in use by another app |
| "Stream format not supported" | See [Stream Playback Issues](docs/TROUBLESHOOTING.md#stream-playback-issues) |
| Link/QR stopped working after moving networks | The share card always shows the PC's **current** network address — re-share the link/QR after the network changes; old links point at the old address |
| Audio reaches listeners ~1–1.5 s after the room | Normal — the low-latency player holds a small buffer that also absorbs Icecast's ½-second delivery rhythm; how it works and how to tune it: [docs/LATENCY.md](docs/LATENCY.md) |

> **📖 In-app guide:** LANStreamer ships with a built-in troubleshooting page at `http://localhost:3001/docs` — open it from any browser on the operator PC. For the full guide see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (subnet issues, firewall configuration, network diagnostics).

---

## 🔄 Updating

**Desktop app:** download the new build from [GitHub Releases](https://github.com/jerryagenyi/LANStreamer/releases) — run the new Setup over the old install, or replace your Standalone exe. Your streams and settings (`%APPDATA%\LANStreamer`) are kept.

**ZIP/source installs:** double-click `Update LANStreamer.bat` in your installation folder.

---

## 📊 Telemetry & Privacy

LANStreamer is **free and open source — no one makes money from it, and no one should** (MIT license).

**Telemetry is ON by default (opt-out).** **What is collected:** anonymous events — app start, stream started/stopped/failed (with the error *category* only), app version, OS, and a random install ID. Every event also carries a fixed `app: lanstreamer` tag (the maintainer's PostHog project is shared across apps; the tag separates this app's events). **Never collected:** audio, stream names, contact details, file paths, IPs, or any personal data.

**Listener failure reports:** when playback fails on a listener's device (audio error, buffer stall, the stream going off-air mid-listen, or the page failing to load), the listener page reports it to the *operator's own server*, which relays it to PostHog **only while the operator's telemetry is on** — carrying the stream label (e.g. "S1"), the media error code, and the browser platform. Listener devices never talk to PostHog directly and never hold any key; with telemetry off, the reports are dropped at the server.

- **First run** shows a plain notice that statistics are on, what they contain, and a one-click **Turn it off**.
- **Change it anytime**: dashboard → sidebar → **Admin account** → *Anonymous usage statistics* switch, or tray icon → **Telemetry → On/Off**.
- Events go to the maintainer's PostHog over the internet, queued and flushed in the background — nothing is sent while telemetry is off, and a fully offline LAN works either way.
- Maintainers packaging a distributed build: run `node scripts/prepare-telemetry-key.mjs` before building — it bundles the PostHog key into the app (gitignored) so other operators' installs report too (each with their own off switch).

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [In-app Guide](http://localhost:3001/docs) | Troubleshooting & guide page built into the app |
| **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** | Common issues and solutions (subnet, firewall, playback) |
| [Installation Guides](docs/guides/README.md) | FFmpeg and Icecast setup guides |
| [Network Setup](docs/NETWORK-SETUP.md) | Static IP configuration for live events |
| [Latency Guide](docs/LATENCY.md) | Getting the lowest latency for listeners |
| [Manual Setup](manual-setup/README.md) | Hardware-specific configuration guides |
| [Changelog](docs/CHANGELOG.md) | Version history and release notes |

---

## 🧑‍💻 For Developers

Building from source, running the test suite, architecture notes, and the contribution workflow (branch model, CI, UI rules, telemetry internals) all live in the **[Developer Guide](docs/README-DEVELOPERS.md)**. Preparing a release? Follow **[docs/GO-LIVE-CHECKLIST.md](docs/GO-LIVE-CHECKLIST.md)** (test matrix, packaging, versioning, GitHub release notes). See also [CLAUDE.md](CLAUDE.md) for enforced code patterns.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

1. Check the in-app guide at `http://localhost:3001/docs`
2. See the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
3. Review the [Installation Guides](docs/guides/README.md)
4. Create an issue on GitHub with detailed information

---

**LANStreamer** - Professional audio streaming for local networks. Perfect for conferences, meetings, and events requiring reliable multi-channel audio distribution.
