@echo off
setlocal enabledelayedexpansion
title LANStreamer Server
color 0B

:: Display LANStreamer banner
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                        LANStreamer                           ║
echo  ║                   Audio Streaming Server                     ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Starting LANStreamer Server...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ ERROR: Node.js is not installed or not in PATH
    echo.
    echo  Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if we're in the correct directory (look for package.json)
if not exist "package.json" (
    echo  ❌ ERROR: Not in LANStreamer directory
    echo.
    echo  Please run this batch file from the LANStreamer folder
    echo  that contains package.json
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo  📦 Installing dependencies...
    echo.
    npm install
    if errorlevel 1 (
        echo.
        echo  ❌ ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo.
)

:: Get local IPv4 address (prefer 192.168.x.x range for main network)
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set CURRENT_IP=%%b
        :: Remove any leading spaces
        for /f "tokens=* delims= " %%c in ("!CURRENT_IP!") do set CURRENT_IP=%%c
        :: Check if it's a 192.168.x.x address (preferred for local networks)
        echo !CURRENT_IP! | findstr /r "^192\.168\." >nul
        if not errorlevel 1 (
            set LOCAL_IP=!CURRENT_IP!
            goto :ip_found
        )
        :: If no 192.168.x.x found yet, keep the first one as fallback
        if "!LOCAL_IP!"=="" set LOCAL_IP=!CURRENT_IP!
    )
)
:ip_found

:: Start the server
echo  🚀 Starting LANStreamer Server...
echo.
echo  ✅ Admin Dashboard: http://%LOCAL_IP%:3001
echo  ✅ Streams Page for Listeners: http://%LOCAL_IP%:3001/streams
echo.
echo  💡 TIP: Start Icecast server before creating streams!
echo.
echo  ⚠️  IMPORTANT: DO NOT CLOSE THIS WINDOW - IT WILL STOP THE SERVER!
echo  💡 YOU CAN MINIMISE THIS WINDOW TO KEEP THE SERVER RUNNING
echo.
echo  Press Ctrl+C to stop the server
echo.
echo  ═══════════════════════════════════════════════════════════════
echo.

:: Start the Node.js server
npm start

:: If we get here, the server has stopped
echo.
echo  ⏹️  LANStreamer Server has stopped
echo.
pause
