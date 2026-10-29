# LANStreamer

**LAN audio streaming for language interpretation, meetings, and events.** LANStreamer is a desktop app that turns an ordinary PC into a multi-channel audio streaming server for your local network (LAN) — it orchestrates **FFmpeg** and **Icecast** behind the scenes, so a whole room can listen to live, low-latency audio on their phones.

> **Status:** the Electron desktop app is in active development on the `dev` branch. There is **no downloadable installer yet** — until the first packaged release, run it from source (`npm run electron:dev`, or the server-only `Start LANStreamer Server.bat` for a source/ZIP copy). FFmpeg and Icecast are installed separately for now. The path to the first bundled release lives in [docs/GO-LIVE-CHECKLIST.md](docs/GO-LIVE-CHECKLIST.md).

---

## 🎯 What is LANStreamer?

Think "wireless interpretation booth": the interpreter's PC captures audio (microphone, audio interface, or virtual audio cable) and broadcasts it over Wi-Fi. Anyone on the same network opens a link in their browser and listens — nothing to install.

### Interfaces

| Interface | Purpose | Access |
|-----------|---------|--------|
| **Admin Dashboard** | Control center for managing streams | `http://localhost:3001/dashboard` on the operator PC (login: `admin` / `lanstreamer123` by default) |
| **Listener Interface** | User-friendly page for browsing and playing streams | `http://YOUR-PC-IP:3001/streams` (public, no login) |

### Use Cases

- **Language Interpretation**: Multiple language channels for conferences
- **Meeting Audio**: Professional audio distribution for events
- **Training Sessions**: Audio streaming for educational content
- **Local Broadcasting**: Any situation requiring reliable, low-latency audio distribution

---

## 🚀 Quick Start (Desktop App)

**Step 1: Launch LANStreamer**
Start the LANStreamer app on the operator PC. It starts the streaming server and opens the dashboard window automatically — no terminal windows to babysit. Closing the window only hides it to the tray: streams keep running for your listeners. To stop for real, use the tray icon → **Stop All & Quit**.

> No app package? You can run the same server from a source/ZIP copy: double-click `Start LANStreamer Server.bat` (requires [Node.js](https://nodejs.org/) LTS, plus FFmpeg & Icecast — see the [Installation Guides](docs/guides/README.md)). Building the desktop package from source is covered in the [Developer Guide](docs/README-DEVELOPERS.md).

**Step 2: Sign In**
The dashboard asks you to sign in when it opens.

- **Username**: `admin`
- **Password**: `lanstreamer123`

Change these before your event — see [Security Setup](#-security-setup--admin-login) below.

**Step 3: Create a Stream**
Click **Add stream**, pick an audio source (your microphone, audio interface, or virtual audio cable), choose a quality, and click **Go live**. Repeat for more channels (e.g. one per language). You can also use **Start All / Stop All**.

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

Sign in at `http://localhost:3001/dashboard` (or the Electron app window) — the login appears automatically when the dashboard is opened. The **listener page (`/streams`) has no login**; phones on the LAN just open the shared link.

**First run:** while the default credentials are active, the dashboard shows a banner stating them and how to change them — it disappears permanently once you set your own.

Admin access has two layers:

1. **Login (username + password)** — every admin API call requires a session token from signing in.
2. **Localhost lock** — the dashboard and admin APIs refuse connections from other machines, so even someone on your LAN with the password cannot reach admin.

To change the defaults, copy `env.example` to `.env`, then edit:

```env
ADMIN_USERNAME=your-new-username
ADMIN_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

Restart LANStreamer afterwards. (Logins stay valid for 7 days, or set `JWT_EXPIRES_IN` to change that.)

---

## ⚙️ System Requirements

**Minimum (operator PC)**
- Windows 10/11 64-bit (macOS/Linux supported from source)
- 4 GB RAM, dual-core CPU — encoding one stream uses ~2–5% of a modern CPU
- Any audio input (built-in mic, USB, or virtual audio cable)
- FFmpeg + Icecast (bundling planned; today installed separately — see [guides](docs/guides/README.md))

**Listeners:** any phone/PC with a browser and WiFi — nothing to install. ~20–25 listeners per consumer WiFi access point for stable audio; larger events should add access points.

**Recommended:** 8 GB RAM for 4+ simultaneous streams, wired Ethernet from the operator PC to the router, 5 GHz WiFi for listeners (see [Latency guide](docs/LATENCY.md)).

---

## 🛠️ Troubleshooting

**Common Issues:**

| Problem | Quick Fix |
|---------|-----------|
| Stream won't start | Make sure the audio device isn't already in use by another app; rescan devices in the dashboard |
| Listeners can't connect | Check everyone is on the **same Wi-Fi/network** as the operator PC, and the link uses the PC's LAN IP (not `localhost`). Also see [Firewall Issues](docs/TROUBLESHOOTING.md#firewall-issues) |
| "This site can't be reached" | Likely subnet mismatch — see [Network Troubleshooting](docs/TROUBLESHOOTING.md#network-connectivity-issues) |
| "Port 3001 already in use" | A leftover server instance is running — close its terminal window (or quit the app from the tray), or end `node.exe` in Task Manager, then relaunch. The dashboard's stop buttons end streams and Icecast, but no button can stop the server itself |
| "No audio devices detected" | Ensure device is connected and not in use by another app |
| "Stream format not supported" | See [Stream Playback Issues](docs/TROUBLESHOOTING.md#stream-playback-issues) |
| Link/QR stopped working after moving networks | The share card always shows the PC's **current** network address — re-share the link/QR after the network changes; old links point at the old address |

> **📖 In-app guide:** LANStreamer ships with a built-in troubleshooting page at `http://localhost:3001/docs` — open it from any browser on the operator PC. For the full guide see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (subnet issues, firewall configuration, network diagnostics).

---

## 🔄 Updating

**Packaged installs (once released):** download the new installer from [GitHub Releases](https://github.com/jerryagenyi/LANStreamer/releases) and run it — your stream configuration is kept.

**ZIP/source installs:** double-click `Update LANStreamer.bat` in your installation folder.

---

## 📊 Telemetry & Privacy

LANStreamer is **free and open source — no one makes money from it, and no one should** (MIT license).

**What we collect (only if you allow it):** anonymous events — app start, stream started/stopped/failed (with the error *category* only), app version, OS, and a random install ID. Every event also carries a fixed `app: lanstreamer` tag (the maintainer's PostHog project is shared across apps; the tag separates this app's events). **Never collected:** audio, stream names, contact details, file paths, IPs, or any personal data.

**Listener failure reports:** when playback fails on a listener's device (audio error, buffer stall, the stream going off-air mid-listen, or the page failing to load), the listener page reports it to the *operator's own server*, which relays it to PostHog **only if the operator allowed telemetry** — carrying the stream label (e.g. "S1"), the media error code, and the browser platform. Listener devices never talk to PostHog directly and never hold any key; without operator consent the reports are dropped at the server.

- **First run** asks once: Allow / Decline. The choice is saved (`config/telemetry.json`).
- **Change it anytime**: tray icon → **Telemetry → On/Off**.
- Events go to the maintainer's PostHog over the internet, queued and flushed in the background — nothing is sent while you decline, and a fully offline LAN works either way.
- Maintainers packaging a distributed build: run `node scripts/prepare-telemetry-key.mjs` before building — it bundles the PostHog key into the app (gitignored) so other operators' installs report too, after their own first-run consent prompt.

**What the app communicates with:** your own LAN (Express + Icecast for streaming), the maintainer's PostHog *if* telemetry is allowed, and GitHub release checks for update notifications.

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
| [System Architecture](docs/LANSTREAMER_SYSTEM_ARCHITECTURE.md) | Complete technical documentation (advanced) |
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
