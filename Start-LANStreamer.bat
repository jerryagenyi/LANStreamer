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
echo  Press Ctrl+C to stop the server
echo.

:: Ask user if they want to start Icecast too
echo  ❓ Do you want to start Icecast server as well? (y/n)
set /p start_icecast="   Enter choice: "

if /i "%start_icecast%"=="y" (
    echo.
    echo  🔍 Looking for Icecast installation...

    :: Check common Icecast installation paths
    set "icecast_path="
    if exist "C:\Program Files (x86)\Icecast\icecast.exe" (
        set "icecast_path=C:\Program Files (x86)\Icecast"
    ) else if exist "C:\Program Files\Icecast\icecast.exe" (
        set "icecast_path=C:\Program Files\Icecast"
    )

    if defined icecast_path (
        echo  ✅ Found Icecast at: %icecast_path%
        echo  🚀 Starting Icecast server...
        echo.
        start "Icecast Server" /D "%icecast_path%" icecast.exe -c icecast.xml
        timeout /t 2 /nobreak >nul
    ) else (
        echo  ⚠️  Icecast not found in standard locations
        echo  💡 You can start it manually later from its installation folder
        echo.
    )
)

echo  ═══════════════════════════════════════════════════════════════
echo.

:: Start the Node.js server
npm start

:: If we get here, the server has stopped
echo.
echo  ⏹️  LANStreamer Server has stopped
echo.
pause
