# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides both **manual setup guides** and a **web-based application** for live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

## Project Structure

```
LANStreamer/
├── README.md                                    # This file - project overview
├── LANStreamer-Audio-Pipeline-Concepts.md      # Core concepts and troubleshooting
├── LANStreamer-basic-xr18.md                   # XR18 hardware setup guide
├── LANStreamer-basic-dvs.md                    # DVS/Dante setup guide
├── start_dvs_streams.bat                       # Multi-stream batch file
├── stream.bat                                  # Single stream example
└── vue-app/                                    # Vue.js web application
    ├── package.json                            # Node.js dependencies
    ├── src/                                    # Server-side code (Express + Node.js)
    ├── frontend/                               # Frontend code (Vue.js)
    └── README.md                               # Web app documentation
```

## Two Ways to Use LANStreamer

### 1. 📖 **Manual Setup** (Recommended for Learning)
- **Step-by-step guides** for XR18 and DVS hardware
- **Batch file approach** with variable-based configuration
- **Complete understanding** of the audio pipeline
- **Perfect for troubleshooting** and customization

### 2. 🖥️ **Vue.js Web Application** (In Development)
- **Browser-based interface** for stream control
- **Real-time monitoring** and status updates
- **User-friendly** for non-technical operators
- **Advanced features** like recording and analytics

## Features

- **Automated Setup:** A guided wizard automates the installation and configuration of Icecast and FFmpeg.

- **Audio Device Detection:** Automatically detects and lists connected audio devices (e.g., the Behringer XR18).

- **Multi-Stream Management:** Start, stop, and manage individual audio streams from a simple web-based dashboard.

- **Real-time Status:** View the live status of all streams and system components.

- **User-Friendly Interface:** A clean web interface allows users on the network to easily select and listen to the audio stream of their choice.

- **OBS Studio Integration:** Generates streaming URLs for easy integration with OBS Studio for broadcasting to platforms like YouTube or Twitch.

## How It Works

LANStreamer simplifies the workflow by acting as a central control panel for three core components:

1. **Audio Device:** A multi-channel audio interface like the Behringer XR18 (or Focusrite Scarlett 18i20) captures audio from multiple microphones and sends it to the host PC via a USB connection.

2. **FFmpeg:** This powerful tool is used to read the individual audio channels from the XR18, encode them into a streamable format (like MP3), and push them to the streaming server.

3. **Icecast:** The open-source streaming server that receives the streams from FFmpeg and broadcasts them to any connected client on the network.

LANStreamer manages the configuration and execution of the FFmpeg and Icecast components, providing a simple web interface for a one-click streaming experience.

## Visual Concept Overview

### LANStreamer Concept

<div align="center">
  <img src="images/lanstreamer-local-audio-concept-1.jpg" width="45%" alt="LANStreamer Local Server Setup" style="border: 1px solid #ccc;" />
  <img src="images/lanstreamer-local-audio-concept-2.jpg" width="45%" alt="LANStreamer Alternative Setup" style="border: 1px solid #ccc;" />
</div>

**How LANStreamer Works:**
- **4 Audio Inputs:** Connect interpreters' microphones (ENG, FRA, POR, ARA)
- **Local Streaming Server:** Uses Icecast or similar streaming technology
- **Simple Web Interface:** Participants access streams through a basic webpage
- **QR Code Access:** Easy connection - scan and listen, no app downloads required
- **Mobile-Friendly:** Works on any device with a web browser
- **Flexible Implementation:** Multiple approaches to achieve the same goal

**Key Benefits:**
- **Complete Control:** Your own local streaming server
- **No Internet Required:** Works entirely on your local network
- **Cost-Effective:** Uses free, open-source software
- **Privacy:** Audio never leaves your network
- **Reliable:** No dependency on external services
- **Multiple Options:** Choose the streaming approach that works best for your setup

> 💡 **Perfect for:** Conferences, meetings, language interpretation events, and any situation where you need reliable, low-latency audio distribution to multiple listeners on a local network.

## Getting Started

### Prerequisites

- A PC running Windows, macOS, or Linux.

- A multi-channel audio interface (e.g., Behringer XR18).

- The **X AIR EDIT** application for routing your audio interface channels.

### Quick Start Options

#### Option 1: Manual Setup (Recommended for Beginners)

1. **Clone this repository:**
   ```bash
   git clone https://github.com/your-username/LANStreamer.git
   cd LANStreamer
   ```

2. **Choose your hardware setup guide:**
   - **XR18/Scarlett Users:** Follow [LANStreamer-basic-xr18.md](LANStreamer-basic-xr18.md)
   - **DVS/Dante Users:** Follow [LANStreamer-basic-dvs.md](LANStreamer-basic-dvs.md)

3. **Start with single stream testing:**
   - Edit and run `stream.bat` for your first test
   - Once working, advance to multi-stream batch files

#### Option 2: Vue.js Web Application (Advanced)

1. **Navigate to the web app:**
   ```bash
   cd vue-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

> 📖 **New to LANStreamer?** Start with the **manual setup guides** to understand the core concepts, then advance to the web application for production use.

