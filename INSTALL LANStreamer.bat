@echo off
setlocal enabledelayedexpansion
title LANStreamer Installation
color 0A

:: Display LANStreamer banner
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    LANStreamer Installation                  ║
echo  ║                   Audio Streaming Server                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will install LANStreamer and set up mDNS support.
echo  Please run this script as Administrator for full functionality.
echo.

:: Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  WARNING: Not running as Administrator
    echo  Some features may not work properly.
    echo  For full mDNS support, please run as Administrator.
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "!continue!"=="y" (
        echo  Installation cancelled.
        pause
        exit /b 1
    )
    echo.
) else (
    echo  ✅ Running as Administrator - Full functionality available
    echo.
)

:: Check if Node.js is installed
echo  🔍 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ ERROR: Node.js is not installed or not in PATH
    echo.
    echo  Please install Node.js from: https://nodejs.org/
    echo  Choose the LTS version for best compatibility.
    echo.
    echo  After installing Node.js, run this script again.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo  ✅ Node.js found: !NODE_VERSION!
)

:: Check if we're in the correct directory
echo  🔍 Checking LANStreamer directory...
if not exist "package.json" (
    echo  ❌ ERROR: Not in LANStreamer directory
    echo.
    echo  Please run this batch file from the LANStreamer folder
    echo  that contains package.json
    echo.
    pause
    exit /b 1
) else (
    echo  ✅ LANStreamer directory found
)

:: Install dependencies
echo.
echo  📦 Installing LANStreamer dependencies...
echo  This may take a few minutes...
echo.
npm install
if errorlevel 1 (
    echo.
    echo  ❌ ERROR: Failed to install dependencies
    echo.
    echo  Please check your internet connection and try again.
    echo  If the problem persists, try running: npm cache clean --force
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo  ✅ Dependencies installed successfully
)

:: Get local IP address
echo  🔍 Detecting network configuration...
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set CURRENT_IP=%%b
        for /f "tokens=* delims= " %%c in ("!CURRENT_IP!") do set CURRENT_IP=%%c
        echo !CURRENT_IP! | findstr /r "^192\.168\." >nul
        if not errorlevel 1 (
            set LOCAL_IP=!CURRENT_IP!
            goto :ip_found
        )
        if "!LOCAL_IP!"=="" set LOCAL_IP=!CURRENT_IP!
    )
)
:ip_found

if "!LOCAL_IP!"=="" (
    echo  ⚠️  WARNING: Could not detect local IP address
    set LOCAL_IP=localhost
) else (
    echo  ✅ Local IP detected: !LOCAL_IP!
)

:: Setup mDNS support
echo.
echo  🌐 Setting up mDNS support...
echo  This creates a stable hostname (lanstreamer.local) so listeners don't need
echo  to update IP addresses when your router restarts.
echo.

:: Check if running as admin for mDNS setup
net session >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Cannot enable mDNS (requires Administrator privileges)
    echo  You can enable it manually later or use IP addresses.
    echo.
    set /p mdns_choice="Would you like to try installing Bonjour Print Services instead? (y/n): "
    if /i "!mdns_choice!"=="y" goto install_bonjour_alternative
    goto skip_mdns
) else (
    echo  Choose mDNS setup method:
    echo  1. Enable Windows mDNS feature (Recommended)
    echo  2. Install Bonjour Print Services (Alternative)
    echo  3. Skip mDNS setup (use IP addresses)
    echo.
    set /p mdns_choice="Enter your choice (1, 2, or 3): "
    
    if "!mdns_choice!"=="1" goto enable_windows_mdns
    if "!mdns_choice!"=="2" goto install_bonjour_alternative
    if "!mdns_choice!"=="3" goto skip_mdns
    goto invalid_mdns_choice
)

:enable_windows_mdns
echo.
echo  🔧 Enabling Windows mDNS feature...
dism /online /enable-feature /featurename:MDNS /all /quiet
if errorlevel 1 (
    echo  ⚠️  Could not enable Windows mDNS feature
    echo  Falling back to IP address method.
) else (
    echo  ✅ Windows mDNS feature enabled
    echo  Note: You may need to restart your computer for full effect
)
goto mdns_complete

:install_bonjour_alternative
echo.
echo  📦 Installing Bonjour Print Services...
echo  This may not work on newer Windows versions.
echo.
powershell -Command "& {Invoke-WebRequest -Uri 'https://support.apple.com/downloads/bonjour_for_windows' -OutFile 'bonjour_setup.exe'}" 2>nul
if exist bonjour_setup.exe (
    echo  ✅ Bonjour installer downloaded
    echo  Please follow the installation wizard when it opens.
    start bonjour_setup.exe
    echo  After installation, restart your computer.
) else (
    echo  ⚠️  Could not download Bonjour installer
    echo  You can download it manually from Apple's website.
)
goto mdns_complete

:skip_mdns
echo.
echo  ⚠️  Skipping mDNS setup
echo  You will need to use IP addresses to access the server.
echo  The IP address will be shown when you start the server.
goto mdns_complete

:invalid_mdns_choice
echo.
echo  Invalid choice. Skipping mDNS setup.
goto mdns_complete

:mdns_complete
echo.

:: Create desktop shortcut
echo.
echo  🔗 Creating desktop shortcut...
set DESKTOP=%USERPROFILE%\Desktop
if exist "%DESKTOP%" (
    echo @echo off > "%DESKTOP%\Start LANStreamer.bat"
    echo cd /d "%~dp0" >> "%DESKTOP%\Start LANStreamer.bat"
    echo start "LANStreamer Server" "Start LANStreamer Server.bat" >> "%DESKTOP%\Start LANStreamer.bat"
    echo  ✅ Desktop shortcut created
) else (
    echo  ⚠️  Could not create desktop shortcut (Desktop folder not found)
)

:: Installation complete
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    Installation Complete!                   ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  🎉 LANStreamer has been installed successfully!
echo.
echo  📋 Access Information:
echo  ✅ Admin Dashboard: http://!LOCAL_IP!:3001
echo  ✅ Streams Page: http://lanstreamer.local:3001/streams (after restart)
echo  ✅ Streams Page: http://!LOCAL_IP!:3001/streams (immediate)
echo.
echo  🚀 Next Steps:
echo  1. Restart your computer (for mDNS to work properly)
echo  2. Run "Start LANStreamer Server.bat" to start the server
echo  3. Start Icecast server before creating streams
echo.
echo  💡 Tips:
echo  - Use the desktop shortcut to start LANStreamer easily
echo  - The server will advertise as "lanstreamer.local" on your network
echo  - Listeners can bookmark the stable hostname URL
echo.

set /p start_now="Would you like to start LANStreamer now? (y/n): "
if /i "!start_now!"=="y" (
    echo.
    echo  🚀 Starting LANStreamer Server...
    echo.
    start "LANStreamer Server" "Start LANStreamer Server.bat"
    echo  ✅ LANStreamer Server started in a new window
) else (
    echo.
    echo  📝 To start LANStreamer later, run: Start LANStreamer Server.bat
    echo  Or use the desktop shortcut.
)

echo.
echo  Press any key to exit...
pause >nul
