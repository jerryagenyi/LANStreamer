# LANStreamer

A simple, headless Node.js application that turns a standard PC into a multi-channel audio streaming server for a local area network (LAN). This project is designed to simplify the process of setting up live, low-latency audio broadcasts for events like language interpretation, meetings, or conferences.

## Features

- **Automated Setup:** A guided wizard automates the installation and configuration of Icecast and FFmpeg.

- **Audio Device Detection:** Automatically detects and lists connected audio devices (e.g., the Behringer XR18).

- **Multi-Stream Management:** Start, stop, and manage individual audio streams from a simple web-based dashboard.

- **Real-time Status:** View the live status of all streams and system components.

- **User-Friendly Interface:** A clean web interface allows users on the network to easily select and listen to the audio stream of their choice.

- **OBS Studio Integration:** Generates streaming URLs for easy integration with OBS Studio for broadcasting to platforms like YouTube or Twitch.

## How It Works

LANStreamer simplifies the workflow by acting as a central control panel for three core components:

1. **Audio Device:** A multi-channel audio interface like the Behringer XR18 captures audio from multiple microphones and sends it to the host PC via a USB connection.

2. **FFmpeg:** This powerful tool is used to read the individual audio channels from the XR18, encode them into a streamable format (like MP3), and push them to the streaming server.

3. **Icecast:** The open-source streaming server that receives the streams from FFmpeg and broadcasts them to any connected client on the network.

LANStreamer manages the configuration and execution of the FFmpeg and Icecast components, providing a simple web interface for a one-click streaming experience.

## Getting Started

### Prerequisites

- A PC running Windows, macOS, or Linux.

- A multi-channel audio interface (e.g., Behringer XR18).

- The **X AIR EDIT** application for routing your audio interface channels.

### Installation

1. Clone this repository:

```bash
git clone https://github.com/your-username/LANStreamer.git
cd LANStreamer
```

2. Install the dependencies:

```bash
npm install
```

3. Start the application and follow the on-screen setup wizard:

```bash
npm start
```
