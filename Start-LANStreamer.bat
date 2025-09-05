@echo off
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

:: Start the server
echo  🚀 Starting LANStreamer Server...
echo.
echo  ✅ Server will be available at: http://localhost:3001
echo  ✅ Admin Dashboard: http://localhost:3001
echo  ✅ Streams Page: http://localhost:3001/streams
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
