@echo off
setlocal enabledelayedexpansion
title LANStreamer Installation
color 0A

:: Change to the directory where this batch file is located
cd /d "%~dp0"

:: Display LANStreamer banner
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    LANStreamer Installation                  ║
echo  ║                   Audio Streaming Server                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will install LANStreamer dependencies and create shortcuts.
echo  For mDNS setup, run "SETUP mDNS.bat" after installation.
echo.

:: Check if Node.js is installed
echo  🔍 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ ERROR: Node.js is not installed or not in PATH
    echo.
    echo  Please install Node.js from: https://nodejs.org/
    echo  Choose the "LTS" (Long Term Support) version
    echo.
    echo  After installing Node.js, restart this script.
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
    echo  ✅ Node.js found: !NODE_VERSION!
)

:: Check if we're in the correct directory
echo  🔍 Checking LANStreamer directory...
echo  Current directory: %CD%
if not exist "package.json" (
    echo  ❌ ERROR: Not in LANStreamer directory
    echo.
    echo  Please run this batch file from the LANStreamer folder
    echo  that contains package.json
    echo.
    echo  Current: %CD%
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
    echo  ⚠️  WARNING: npm install returned an error code
    echo  This might be normal if dependencies are already installed.
    echo.
    echo  Checking if node_modules exists...
    if exist "node_modules" (
        echo  ✅ node_modules folder found - dependencies appear to be installed
        echo  Continuing with installation...
    ) else (
        echo  ❌ ERROR: No node_modules folder found
        echo.
        echo  Please check your internet connection and try again.
        echo  If the problem persists, try running: npm cache clean --force
        echo.
        set /p continue_anyway="Continue anyway? (y/n): "
        if /i not "!continue_anyway!"=="y" (
            pause
            exit /b 1
        )
    )
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
    )
)

:ip_found
if "!LOCAL_IP!"=="" (
    echo  ⚠️  Could not detect local IP address
    set LOCAL_IP=localhost
) else (
    echo  ✅ Local IP detected: !LOCAL_IP!
)

:: Create desktop shortcut
echo.
echo  🔗 Creating desktop shortcut...
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\LANStreamer.lnk'); $Shortcut.TargetPath = '%CD%\Start LANStreamer Server.bat'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Save()}" 2>nul
if errorlevel 1 (
    echo  ⚠️  Could not create desktop shortcut
) else (
    echo  ✅ Desktop shortcut created
)

:: Installation complete
echo.
echo  ═══════════════════════════════════════════════════════════════
echo  🎉 LANStreamer Installation Complete!
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  📋 What's installed:
echo  ✅ LANStreamer dependencies
echo  ✅ Desktop shortcut
echo.
echo  🌐 Access URLs:
echo  ✅ Admin Dashboard: http://!LOCAL_IP!:3001
echo  ✅ Streams Page: http://!LOCAL_IP!:3001/streams
echo.
echo  🚀 Next Steps:
echo  1. Run "SETUP mDNS.bat" for stable hostname (optional)
echo  2. Run "Start LANStreamer Server.bat" to start the server
echo  3. Install FFmpeg and Icecast (see guides in docs/guides/)
echo.
echo  💡 Tips:
echo  - Use the desktop shortcut to start LANStreamer easily
echo  - Check the installation guides for FFmpeg and Icecast setup
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
echo  ═══════════════════════════════════════════════════════════════
echo  🎉 Installation Complete!
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  Press any key to close this window...
pause
