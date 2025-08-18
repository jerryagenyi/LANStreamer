A step-by-step solution for setting up your audio streaming system using the Behringer XR18, FFmpeg, Icecast, and a simple webpage.

### Overview

The XR18 will connect to a router via an Ethernet cable. A computer will also connect to this same router. The XR18 will send its audio inputs to the computer. The computer will run two key pieces of software: **Icecast** (the streaming server) and **FFmpeg** (to capture and encode the audio). The computer will also host a simple webpage that users on the same network can access to listen to the streams.

-----

### Step 1: Hardware Setup

1.  **Connect the XR18**: Power on the XR18 mixer. Connect an Ethernet cable from the XR18's **Ethernet port** to one of the **LAN ports** on your network router.
2.  **Connect Microphones**: Plug the four interpreter microphones into inputs 1, 2, 3, and 4 on the XR18.
3.  **Connect the Computer**: Connect your computer to the same router, either with an Ethernet cable or via Wi-Fi.
4.  **Install the Drivers**: On your computer, install the **Behringer XR18 USB drivers**. These are essential for the computer to recognise the XR18 as a multi-channel audio device. You can find them on the Behringer website.

-----

### Step 2: XR18 Software Configuration

1.  **Install X AIR EDIT**: Download and install the **X AIR EDIT** app on your computer. This is the control software for the XR18.
2.  **Connect to the Mixer**: Open X AIR EDIT. It should automatically detect and connect to the XR18 on your network.
3.  **USB Routing**: In the X AIR EDIT app, go to the **"In/Out"** or **"Routing"** section.
      * Navigate to the **"USB Sends"** tab.
      * Set **USB Send 1** to **"Ch 1/A"** (for the English microphone).
      * Set **USB Send 2** to **"Ch 2/B"** (for the French microphone).
      * Set **USB Send 3** to **"Ch 3/C"** (for the Portuguese microphone).
      * Set **USB Send 4** to **"Ch 4/D"** (for the Arabic microphone).
      * This configuration tells the XR18 to send each microphone's signal to a dedicated USB channel on your computer.

-----

### Step 3: Software Installation and Configuration

#### **Install Icecast**

1.  **Download Icecast**: Download and install the **Icecast** streaming server software from the official Xiph.org website.
2.  **Configure Icecast**: Find the `icecast.xml` configuration file (usually in the `C:\Program Files\Icecast\etc` folder on Windows). Open it with a text editor.
      * Change the `<source-password>`, `<relay-password>`, and `<admin-password>` to something secure (e.g., `my-secure-password`).
      * Set the `<hostname>` to your computer's local IP address or `localhost`.
      * Save the file and start the Icecast server. You can verify it's running by opening a web browser and going to `http://localhost:8000/`.

#### **Install FFmpeg**

1.  **Download FFmpeg**: Download a static build of **FFmpeg**. Extract the `ffmpeg.exe` file and place it in a simple location, like `C:\ffmpeg\`.
2.  **Verify Device Names**: You need to find the exact name of your XR18's audio channels as recognised by FFmpeg.
      * Open a Command Prompt or Terminal.
      * Run `ffmpeg -list_devices true -f dshow -i dummy`.
      * This command will list all audio input devices. Look for the XR18 and note the names of the individual channels. They might appear as **"XR18-USB Audio (1)"**, **"XR18-USB Audio (2)"**, etc.

-----

### Step 4: Streaming with FFmpeg

You will need to run a separate FFmpeg command for each language stream. Create a batch file or script to make this easier.

1.  **Create a Text File**: Create a new text file and save it as `start_streams.bat`.
2.  **Add FFmpeg Commands**: Add the following lines to the file, adjusting the device names and your Icecast password. Each command captures one audio channel and pushes it to a specific mount point on Icecast.

<!-- end list -->

```bash
REM English Stream
start /min ffmpeg -f dshow -i audio="XR18-USB Audio (1)" -acodec libmp3lame -b:a 128k -content_type audio/mpeg -f mp3 icecast://source:my-secure-password@localhost:8000/eng

REM French Stream
start /min ffmpeg -f dshow -i audio="XR18-USB Audio (2)" -acodec libmp3lame -b:a 128k -content_type audio/mpeg -f mp3 icecast://source:my-secure-password@localhost:8000/fra

REM Portuguese Stream
start /min ffmpeg -f dshow -i audio="XR18-USB Audio (3)" -acodec libmp3lame -b:a 128k -content_type audio/mpeg -f mp3 icecast://source:my-secure-password@localhost:8000/por

REM Arabic Stream
start /min ffmpeg -f dshow -i audio="XR18-USB Audio (4)" -acodec libmp3lame -b:a 128k -content_type audio/mpeg -f mp3 icecast://source:my-secure-password@localhost:8000/ara
```

  * `start /min`: This command runs the FFmpeg process in a minimised window.
  * `-f dshow`: Specifies the DirectShow audio input format (for Windows).
  * `-i audio="..."`: This is where you put the exact name of the XR18's audio channels.
  * `-acodec libmp3lame -b:a 128k`: These settings encode the audio to MP3 at a bitrate of 128 kbps. You can adjust this for quality vs. bandwidth.
  * `icecast://...`: This is the destination URL for the stream. `source` and `my-secure-password` are the credentials you set in `icecast.xml`, and `/eng`, `/fra`, etc., are the unique mount points.

-----

### Step 5: Web Page Creation

1.  **Create an HTML file**: Create a new file named `index.html` in a web server directory. You can use Icecast's built-in web server by placing the file in the `web` folder of your Icecast installation.
2.  **Add the Code**: Add the following code to the `index.html` file. This is a very simple interface with four buttons. When a button is clicked, it changes the source of the hidden `<audio>` player to the selected stream.

<!-- end list -->

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Live Audio Streams</title>
    <style>
        body { font-family: sans-serif; text-align: center; margin-top: 50px; }
        .button-container { display: flex; justify-content: center; gap: 20px; }
        button { padding: 20px 40px; font-size: 1.2em; cursor: pointer; }
    </style>
</head>
<body>

    <h1>Select a Language</h1>

    <div class="button-container">
        <button onclick="changeStream('eng')">English</button>
        <button onclick="changeStream('fra')">Français</button>
        <button onclick="changeStream('por')">Português</button>
        <button onclick="changeStream('ara')">عربي</button>
    </div>

    <audio id="audioPlayer" controls autoplay></audio>

    <script>
        const audioPlayer = document.getElementById('audioPlayer');

        function changeStream(language) {
            // Replace 'your-computer-ip' with the local IP address of the streaming server
            const streamUrl = 'http://your-computer-ip:8000/' + language;
            audioPlayer.src = streamUrl;
            audioPlayer.play().catch(e => console.error("Error playing audio:", e));
        }

        // Set an initial stream to play automatically
        window.onload = () => changeStream('eng');
    </script>

</body>
</html>
```

  * **Host the Page**: The `index.html` file should be placed in the `web` directory of your Icecast installation.
  * **Accessing the Page**: To access this page from another computer on the network, they will need to type in the local IP address of the computer running the server (e.g., `http://192.168.1.100:8000/`).

This setup provides a complete, low-latency, and scalable solution using a **robust hardware-software combination**.