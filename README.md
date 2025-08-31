# LANStreamer

A comprehensive solution that turns a standard PC into a multi-channel audio streaming server for local area networks (LAN). This project provides a **web-based application** for local, live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

For advanced users or for troubleshooting, **manual setup guides** are also available.

## Project Structure

```
LANStreamer/
├── README.md                               # This file - project overview
├── .env.example                            # Environment configuration template
├── package.json                            # Node.js dependencies
├── src/                                    # Server-side code (Express + Node.js)
├── frontend/                               # Frontend code (Vue.js)
├── tests/                                  # Automated tests
├── docs/                                   # Comprehensive documentation
│   ├── LANStreamer-PRD.md                  # Product Requirements Document
│   ├── LANStreamer-TDD.md                  # Test-Driven Development Plan
│   ├── Admin-Dashboard-UI-Design.md        # UI Design Specifications
│   ├── Audio-Monitoring-Feature-Specification.md # Monitoring Feature Specs
│   └── env-example.md                      # Environment Configuration Guide
├── manual-setup/                           # Manual guides and scripts
│   ├── README.md                           # Explanation of the manual setup
│   ├── LANStreamer-basic-xr18.md           # XR18 hardware setup guide
│   ├── LANStreamer-basic-dvs.md            # DVS/Dante setup guide
│   └── ...                                 # Batch files, etc.
└── images/                                 # Project images
```

## Features

- **Automated Setup:** A guided wizard automates the installation and configuration of Icecast and FFmpeg.
- **Professional Audio Device Detection:** Automatically detects and differentiates input and output audio devices for professional setups.
- **Audio Monitoring:** Monitor live streams through local output devices for quality control before broadcasting.
- **Multi-Stream Management:** Start, stop, and manage individual audio streams from a simple web-based dashboard.
- **Real-time Status:** View the live status of all streams and system components via WebSockets.
- **User-Friendly Interface:** A clean web interface allows users on the network to easily select and listen to the audio stream of their choice.
- **Professional Integration:** Supports DVS/Dante audio interfaces for language interpretation and live event management.

## How It Works

LANStreamer simplifies the workflow by acting as a central control panel for three core components:

1.  **Audio Device:** A multi-channel audio interface (e.g., Behringer XR18) captures audio and sends it to the host PC.
2.  **FFmpeg:** This powerful tool reads the audio channels, encodes them, and pushes them to the streaming server.
3.  **Icecast:** The open-source streaming server that broadcasts the streams to any connected client on the network.

## Visual Concept Overview

<div align="center">
  <img src="images/lanstreamer-local-audio-concept-1.jpg" width="45%" alt="LANStreamer Local Server Setup" style="border: 1px solid #ccc;" />
  <img src="images/lanstreamer-local-audio-concept-2.jpg" width="45%" alt="LANStreamer Alternative Setup" style="border: 1px solid #ccc;" />
</div>

**Key Benefits:**
- **Complete Control:** Your own local streaming server.
- **No Internet Required:** Works entirely on your local network.
- **Cost-Effective:** Uses free, open-source software.
- **Privacy:** Audio never leaves your network.

> 💡 **Perfect for:** Conferences, meetings, language interpretation events, and any situation where you need reliable, low-latency audio distribution to multiple listeners on a local network.

## Getting Started

### Prerequisites

- A PC running Windows, macOS, or Linux.
- A multi-channel audio interface (e.g., Behringer XR18).
- The **X AIR EDIT** application for routing your audio interface channels.

### Running the Web Application (Recommended)

1.  **Clone this repository:**
    ```bash
    git clone https://github.com/your-username/LANStreamer.git
    cd LANStreamer
    ```

2.  **Configure environment variables:**
    ```bash
    # Copy the example environment file
    cp .env.example .env
    
    # Edit .env and update the CHANGE_THIS_VALUE entries
    # At minimum, change all passwords for production use!
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

5.  **Access the web interface** by opening a browser to `http://localhost:3001/dashboard` (or the port specified in your `.env` file).

### Manual Setup (Advanced Users)

If you wish to understand the core components or run the system without the web interface, see the guides in the [manual-setup](manual-setup/README.md) folder. The primary hardware guides are:
- **XR18/Scarlett Users:** [LANStreamer-basic-xr18.md](manual-setup/LANStreamer-basic-xr18.md)
- **DVS/Dante Users:** [LANStreamer-basic-dvs.md](manual-setup/LANStreamer-basic-dvs.md)

---

## Configuration

The application uses environment variables. Create a `.env` file in the root directory by copying `.env.example`.

## Technology Stack

### Backend (Node.js + Express)
- **Express.js**: Web server framework
- **Socket.io**: Real-time WebSocket communication

### Frontend (Vue.js)
- **Vue.js 3**: Progressive JavaScript framework
- **Vue Router**: Client-side routing
- **Vuex/Pinia**: State management