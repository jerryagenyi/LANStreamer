# Icecast Installation Guide

> **Complete guide for installing and updating Icecast streaming server on Windows, macOS, and Linux**

## Overview

Icecast is a streaming media server that LANStreamer uses to broadcast audio streams over the network. This guide provides step-by-step instructions for installing and configuring Icecast on all supported platforms.

## Quick Status Check

Before installation, check if Icecast is already installed and running:

```bash
# Check if Icecast is installed
icecast -v

# Check if service is running (Linux/macOS)
ps aux | grep icecast

# Check Windows service
sc query "Icecast"
```

---

## Windows Installation

### Method 1: Official Installer (Recommended)

1. **Download Icecast**
   - Visit [https://icecast.org/download/](https://icecast.org/download/)
   - Download the latest Windows installer (`IcecastWin32-X.X.X-Setup.exe`)

2. **Run the Installer**
   ```
   # Run as Administrator
   # Follow the installation wizard
   # Choose installation directory (default: C:\Program Files\Icecast)
   ```

3. **Configure Icecast**
   ```powershell
   # Navigate to installation directory
   cd "C:\Program Files\Icecast"
   
   # Edit configuration file
   notepad icecast.xml
   ```

4. **Basic Configuration (icecast.xml)**
   ```xml
   <icecast>
       <location>Earth</location>
       <admin>icemaster@localhost</admin>
       
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

5. **Start Icecast**
   ```powershell
   # Start Icecast manually
   icecast.exe -c icecast.xml
   
   # Or install as Windows service
   icecast.exe -install
   
   # Start the service
   net start Icecast
   ```

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
    <relay-password>your_relay_password</relay-password>
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
- Verify Icecast is running: `sudo systemctl status icecast`
- Check firewall settings
- Verify source password matches LANStreamer configuration
- Check Icecast logs for connection attempts

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
