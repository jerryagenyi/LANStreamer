# Icecast Installation Guide

> **Complete guide for installing and configuring Icecast streaming server on Windows, macOS, and Linux**

## Overview

Icecast is a streaming media server that LANStreamer uses to broadcast audio streams over the network. This guide provides step-by-step instructions for installing and configuring Icecast on all supported platforms.

**Important Configuration Note**: Icecast loads its configuration from `icecast.xml` in the root Icecast directory. **Important**: On Windows, the `icecast.exe` executable is located in the `bin` subdirectory, but the `icecast.xml` config file must be in the root Icecast directory. When you run Icecast, it looks for `icecast.xml` in the directory where you execute the command from (typically the root Icecast directory).

According to the [official Icecast documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"}, there are two major components involved:

1. **The streaming server (Icecast)** - Where all listeners of your station will connect
2. **The source client (LANStreamer)** - Runs on a separate machine and sends content to Icecast

> **Important**: Not all source clients work with Icecast 2. You'll need to check that Icecast 2 is supported by your chosen source client (LANStreamer).

> **Note**: This guide follows the official [Icecast Basic Setup documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"} and adapts it for LANStreamer integration.

## Quick Status Check

Before installation, check if Icecast is already installed and running:

```bash
# Check if Icecast is installed
icecast -v

# Check if service is running (Linux/macOS)
ps aux | grep icecast

# Check Windows service
sc query "Icecast"

# Check if process is running (Windows)
tasklist | findstr icecast
```

---

## Key Components

According to the [official Icecast documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"}, after installation you should have:

* **Icecast binary** - The main server executable (`icecast.exe` on Windows inside the bin folder, `icecast` on Unix-like systems)
* **`conf` directory** - Contains the Icecast configuration file (`icecast.xml`) which defines all configuration parameters
* **`admin` directory** - Contains XSLT files for the web-based administration interface
* **`logs` directory** - Blank directory that will contain all logs (if specified in the config file)

---

## Windows Installation

### Method 1: Official Installer (Recommended)

1. **Download Icecast**
   - Visit [https://icecast.org/download/](https://icecast.org/download/){:target="_blank"}
   - Download the latest Windows installer (`IcecastWin32-X.X.X-Setup.exe`)

2. **Installation Directory Structure**
   ```
   C:\Program Files (x86)\Icecast\
   ├── bin\           # Executables (icecast.exe)
   ├── etc\           # Configuration files
   ├── share\         # Web interface and resources
   └── doc\           # Documentation
   ```
   
   **Important**: The `icecast.exe` executable is located in the `bin` subdirectory, not directly in the Icecast folder.

3. **Run the Installer**
   ```
   # Run as Administrator
   # Follow the installation wizard
   # Choose installation directory (default: C:\Program Files\Icecast)
   ```

4. **Configure Icecast**
   ```powershell
   # Navigate to installation directory
   cd "C:\Program Files (x86)\Icecast"
   
   # Edit configuration file
   notepad icecast.xml
   ```

5. **Basic Configuration (icecast.xml)**
   
   **Important**: The Icecast installer creates a properly configured `icecast.xml` file with correct Windows paths. 
   **Do not delete or replace this file** unless you know what you're doing.
   
   According to the [official documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"}, for a basic setup, the following entries should be specified and changed to suit your situation:
   
   - **`<hostname>`** - DNS name or IP address used for stream directory listings
   - **`<source-password>`** - Used for source client authentication
   - **`<admin-password>`** - Used for authenticating admin features
   - **`<listen-socket>`** - Both port and bind-address configuration
   
   The default config includes:
   - Relative paths (`./log`, `./web`, `./admin`) that work on Windows
   - Proper authentication settings
   - Correct port configuration (8000)
   - Web interface setup
   
   ```xml
   <icecast>
       <location>Manchester</location>
       <admin>your-email@example.com</admin>
       
       <limits>
           <clients>100</clients>
           <sources>2</sources>
           <threadpool>5</threadpool>
           <queue-size>524288</queue-size>
           <client-timeout>30</client-timeout>
           <header-timeout>15</header-timeout>
           <source-timeout>10</source-timeout>
       </limits>
       
       <authentication>
           <source-password>hackme</source-password>
           <relay-password>hackme</relay-password>
           <admin-user>admin</admin-user>
           <admin-password>hackme</admin-password>
       </authentication>
       
       <hostname>localhost</hostname>
       
       <listen-socket>
           <port>8000</port>
       </listen-socket>
       
       <fileserve>1</fileserve>
       
       <paths>
           <basedir>C:\Program Files\Icecast</basedir>
           <logdir>C:\Program Files\Icecast\logs</logdir>
           <webroot>C:\Program Files\Icecast\web</webroot>
           <adminroot>C:\Program Files\Icecast\admin</adminroot>
           <alias source="/" destination="/status.xsl"/>
       </paths>
       
       <logging>
           <accesslog>access.log</accesslog>
           <errorlog>error.log</errorlog>
           <loglevel>3</loglevel>
           <logsize>10000</logsize>
       </logging>
   </icecast>
   ```

6. **Start Icecast**
   ```powershell
   # IMPORTANT: Navigate to the Icecast installation directory first
   cd "C:\Program Files (x86)\Icecast"
   
   # Start Icecast manually (must be run from Icecast directory)
   .\icecast.exe -c icecast.xml
   
   # Or use full path from any directory
   "C:\Program Files (x86)\Icecast\icecast.exe" -c "C:\Program Files (x86)\Icecast\icecast.xml"
   
   # Or install as Windows service
   .\icecast.exe -install
   
   # Start the service
   net start Icecast
   ```

7. **Verify Server Started Successfully**
   
   According to the [official documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"}, if no error messages are generated, check the `error.log` file for the 'server started' message. It should look like:
   
   ```
   [2003-10-31  13:04:49] INFO main/main.c Icecast 2.3.0 server started
   ```
   
   You can also verify the server started by visiting: `http://yourip:port/admin/stats.xml`
   - You'll be prompted for username and password
   - Enter username `admin` and the password you set for `<admin-password>`
   - If successful, you'll see an XML tree representing Icecast statistics

### Method 2: Using Chocolatey

```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Icecast
choco install icecast -y
```

---

## macOS Installation

### Method 1: Using Homebrew (Recommended)

1. **Install Homebrew** (if not already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Icecast**
   ```bash
   # Update Homebrew
   brew update
   
   # Install Icecast
   brew install icecast
   ```

3. **Configure Icecast**
   ```bash
   # Configuration file location
   sudo nano /usr/local/etc/icecast.xml
   
   # Or copy and edit the default config
   cp /usr/local/etc/icecast.xml.dist /usr/local/etc/icecast.xml
   ```

4. **Start Icecast**
   ```bash
   # Start manually
   icecast -c /usr/local/etc/icecast.xml
   
   # Or start as a service
   brew services start icecast
   ```

### Method 2: Using MacPorts

```bash
# Install MacPorts first, then:
sudo port install icecast
```

### Method 3: Manual Installation

1. **Download Source**
   ```bash
   curl -O https://downloads.xiph.org/releases/icecast/icecast-2.4.4.tar.gz
   tar -xzf icecast-2.4.4.tar.gz
   cd icecast-2.4.4
   ```

2. **Compile and Install**
   ```bash
   ./configure --prefix=/usr/local
   make
   sudo make install
   ```

---

## Linux Installation

### Ubuntu/Debian

```bash
# Update package lists
sudo apt update

# Install Icecast
sudo apt install icecast2 -y

# During installation, you'll be prompted to configure:
# - Configure Icecast2? -> Yes
# - Hostname: localhost
# - Source password: (choose a secure password)
# - Relay password: (choose a secure password)
# - Administration password: (choose a secure password)
```

### CentOS/RHEL/Fedora

```bash
# For CentOS/RHEL (enable EPEL first)
sudo dnf install epel-release -y
sudo dnf install icecast -y

# For Fedora
sudo dnf install icecast -y

# Start and enable service
sudo systemctl start icecast
sudo systemctl enable icecast
```

### Arch Linux

```bash
# Install Icecast
sudo pacman -S icecast

# Start and enable service
sudo systemctl start icecast
sudo systemctl enable icecast
```

---

## Configuration

### Basic Configuration File

The main configuration file is `icecast.xml`. Key sections to configure:

#### Authentication Settings
```xml
<authentication>
    <source-password>your_source_password</source-password>
    <relay-password>your_relay_password</relay_password>
    <admin-user>admin</admin-user>
    <admin-password>your_admin_password</admin-password>
</authentication>
```

#### Network Settings
```xml
<hostname>localhost</hostname>
<listen-socket>
    <port>8000</port>
    <!-- <bind-address>127.0.0.1</bind-address> -->
</listen-socket>
```

#### Resource Limits
```xml
<limits>
    <clients>100</clients>
    <sources>2</sources>
    <threadpool>5</threadpool>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <request-timeout>10</request-timeout>
    <client-body-timeout>30</client-body-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
</limits>
```

### Security Recommendations

1. **Change Default Passwords**
   ```xml
   <source-password>strong_source_password_123</source-password>
   <admin-password>strong_admin_password_456</admin-password>
   ```

2. **Restrict Admin Access**
   ```xml
   <admin>
       <username>admin</username>
       <password>secure_password</password>
   </admin>
   ```

3. **Firewall Configuration**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 8000/tcp
   
   # CentOS/RHEL/Fedora
   sudo firewall-cmd --permanent --add-port=8000/tcp
   sudo firewall-cmd --reload
   ```

---

## Service Management

### Windows

```powershell
# Install as service
icecast.exe -install

# Start service
net start Icecast

# Stop service
net stop Icecast

# Remove service
icecast.exe -remove
```

### Linux (systemd)

```bash
# Start service
sudo systemctl start icecast

# Stop service
sudo systemctl stop icecast

# Enable auto-start
sudo systemctl enable icecast

# Check status
sudo systemctl status icecast

# View logs
sudo journalctl -u icecast -f
```

### macOS (Homebrew)

```bash
# Start service
brew services start icecast

# Stop service
brew services stop icecast

# Restart service
brew services restart icecast
```

---

## Updating Icecast

### Windows

**Official Installer:**
- Download and run the latest installer
- The installer will update the existing installation

**Chocolatey:**
```powershell
choco upgrade icecast -y
```

### macOS

**Homebrew:**
```bash
brew update
brew upgrade icecast
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt upgrade icecast2 -y
```

**CentOS/RHEL/Fedora:**
```bash
sudo dnf update icecast -y
```

---

## Verification and Testing

### Check Installation

```bash
# Check version
icecast -v

# Check if service is running
# Linux/macOS:
ps aux | grep icecast

# Windows:
tasklist | findstr icecast
```

### Test Web Interface

1. **Access Admin Interface**
   - Open browser and go to `http://localhost:8000/admin/`
   - Login with admin credentials

2. **Check Status Page**
   - Go to `http://localhost:8000/status.xsl`
   - Should show server information and statistics

### Test with LANStreamer

1. **Start Icecast server**
2. **Configure LANStreamer to connect**
3. **Start an audio stream**
4. **Check stream appears in Icecast admin panel**

### Source Client Configuration

According to the [official documentation](https://icecast.org/docs/icecast-2.4.1/basic-setup.html){:target="_blank"}, you'll need to configure your source client (LANStreamer) with:

- **IP address and Port** of the Icecast server (from `<listen-socket>` configuration)
- **Source password** (from `<source-password>` configuration)
- **Mountpoint** - Choose a mountpoint and specify it in the source client

**Important Mountpoint Rules:**
- All Ogg Vorbis streams should have mountpoints ending in `.ogg` (e.g., `/mystream.ogg`)
- MP3 streams usually don't contain extensions (e.g., `/mystream`)
- Mountpoints should not contain spaces or odd characters
- Icecast doesn't need to know about each mountpoint in advance

> **Note**: The steps outlined in this guide are related to the Unix version or Win32 console version of Icecast. Icecast is also available in a Win32 GUI version, and the steps are similar in setup, but not quite the same.

**Testing the Stream:**
Once your source is connected, listeners can access the stream at: `http://yourip:port/mountpoint-you-specified`
- Example: `http://192.0.2.23:8000/mystream.ogg`
- Add `.m3u` extension for playlist format: `http://192.0.2.23:8000/mystream.ogg.m3u`

---

## Troubleshooting

### Common Issues

**"Address already in use" error**
```bash
# Check what's using port 8000
netstat -tulpn | grep :8000

# Kill the process or change Icecast port in config
```

**Permission denied errors**
```bash
# Ensure Icecast user has proper permissions
sudo chown -R icecast:icecast /var/log/icecast
sudo chown -R icecast:icecast /etc/icecast2
```

**Service won't start**
```bash
# Check configuration syntax
icecast -c /etc/icecast2/icecast.xml -v

# Check logs for errors
sudo tail -f /var/log/icecast2/error.log
```

**Can't connect from LANStreamer**
- Verify Icecast is running: `sudo systemctl status icecast` (Linux) or `sc query "Icecast"` (Windows)
- Check firewall settings
- Verify source password matches LANStreamer configuration
- Check Icecast logs for connection attempts

**Windows Path Issues**
- **Error**: "FATAL: could not open error logging (/var/log/icecast2\error.log): No such file or directory"
- **Cause**: Icecast config file contains Unix-style paths on Windows
- **Solution**: 
  - Ensure config file uses Windows-style paths
  - Run Icecast from its installation directory: `cd "C:\Program Files (x86)\Icecast"`
  - Use relative paths in config file or full Windows paths
  - Check that log directories exist and are writable

**Configuration File Path Problems**
- **Error**: "ENOENT: no such file or directory, open 'config\icecast.xml'"
- **Cause**: LANStreamer can't find or create the Icecast config file
- **Solution**:
  - **Recommended**: Use the existing Icecast config file at `C:\Program Files (x86)\Icecast\icecast.xml`
  - Set `ICECAST_CONFIG_PATH=C:\Program Files (x86)\Icecast\icecast.xml` in your `.env` file
  - The Icecast installer creates a properly configured config file with correct Windows paths
  - LANStreamer will automatically use the existing config file instead of generating a new one
  - Restart LANStreamer after making path changes

**Configuring Full Paths for Log Files**
If you want to specify absolute paths for access and error logs instead of relative paths, you can edit the `icecast.xml` file:

1. **Navigate to Icecast directory**:
   ```powershell
   cd "C:\Program Files (x86)\Icecast"
   ```

2. **Edit the configuration file**:
   ```powershell
   notepad icecast.xml
   ```

3. **Update the logging section** to use full paths:
   ```xml
   <logging>
       <accesslog>C:\Program Files (x86)\Icecast\logs\access.log</accesslog>
       <errorlog>C:\Program Files (x86)\Icecast\logs\error.log</errorlog>
       <loglevel>3</loglevel>
       <logsize>10000</logsize>
   </logging>
   ```

4. **Ensure log directories exist**:
   ```powershell
   # Create logs directory if it doesn't exist
   mkdir "C:\Program Files (x86)\Icecast\logs" -Force
   ```

5. **Restart Icecast** after making changes:
   ```powershell
   # Stop Icecast if running
   net stop Icecast
   
   # Start Icecast again
   net start Icecast
   ```

**Benefits of Full Paths**:
- ✅ **Eliminates path-related errors** when running from different directories
- ✅ **More reliable** in production environments
- ✅ **Easier troubleshooting** - you know exactly where logs are located
- ✅ **Works consistently** regardless of where Icecast is started from

### Log Files

**Windows:**
- `C:\Program Files\Icecast\logs\error.log`
- `C:\Program Files\Icecast\logs\access.log`

**Linux:**
- `/var/log/icecast2/error.log`
- `/var/log/icecast2/access.log`

**macOS (Homebrew):**
- `/usr/local/var/log/icecast/error.log`
- `/usr/local/var/log/icecast/access.log`

---

## Integration with LANStreamer

Once Icecast is installed and configured, LANStreamer will:

- ✅ Detect Icecast server automatically
- ✅ Show green status indicator in the dashboard
- ✅ Display listener count and server statistics
- ✅ Enable audio streaming from connected devices

### LANStreamer Configuration

Ensure your LANStreamer configuration matches your Icecast setup:

```javascript
// Example configuration
const icecastConfig = {
    host: 'localhost',
    port: 8000,
    password: 'your_source_password',
    mount: '/stream'
};
```

---

## Performance Optimization

### System Resources

```xml
<limits>
    <clients>500</clients>          <!-- Max concurrent listeners -->
    <sources>10</sources>           <!-- Max concurrent streams -->
    <threadpool>10</threadpool>     <!-- Worker threads -->
    <queue-size>1048576</queue-size> <!-- Buffer size -->
</limits>
```

### Network Settings

```xml
<listen-socket>
    <port>8000</port>
    <shoutcast-mount>/stream</shoutcast-mount>
</listen-socket>
```

### Logging Level

```xml
<logging>
    <loglevel>2</loglevel>  <!-- 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG -->
</logging>
```

---

## Related Documentation

- [FFmpeg Installation Guide](./ffmpeg-installation.md)
- [LANStreamer Technical Specification](../LANStreamer-Technical-Specification.md)
- [Audio Pipeline Concepts](../LANStreamer-Audio-Pipeline-Concepts.md)
- [Authentication & Security Specification](../Authentication-Security-Specification.md)
- [Manual Setup Guides](../manual-setup/README.md)
- [Official Icecast Documentation](https://icecast.org/docs/icecast-latest/){:target="_blank"} - Complete and up-to-date Icecast reference
