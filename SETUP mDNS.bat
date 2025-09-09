@echo off
setlocal enabledelayedexpansion
title LANStreamer mDNS Setup
color 0A

:: Change to the directory where this batch file is located
cd /d "%~dp0"

:: Display banner
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    LANStreamer mDNS Setup                    ║
echo  ║                   Stable Hostname Configuration              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will set up mDNS support for LANStreamer.
echo  mDNS creates a stable hostname (lanstreamer.local) so listeners
echo  don't need to update IP addresses when your router restarts.
echo.

:: Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  WARNING: Not running as Administrator
    echo  mDNS setup requires Administrator privileges.
    echo.
    echo  Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo  ✅ Running as Administrator
echo.

:: Setup mDNS support
echo  🌐 Setting up mDNS support...
echo.
echo  Choose mDNS setup method:
echo  1. Enable Windows mDNS support via registry (Recommended)
echo  2. Install Bonjour Print Services (Alternative)
echo  3. Skip mDNS setup (use IP addresses)
echo.
set /p mdns_choice="Enter your choice (1, 2, or 3): "

if "!mdns_choice!"=="1" goto enable_windows_mdns
if "!mdns_choice!"=="2" goto install_bonjour_alternative
if "!mdns_choice!"=="3" goto skip_mdns
goto invalid_mdns_choice

:enable_windows_mdns
echo.
echo  🔧 Enabling Windows mDNS support...
echo  Setting up mDNS via Windows registry...

:: Enable mDNS via registry
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters" /v "EnableMDNS" /t REG_DWORD /d 1 /f >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Could not modify registry for mDNS
    echo  This is normal on some Windows versions.
) else (
    echo  ✅ mDNS registry setting applied
)

:: Enable Network Discovery
echo  Enabling Network Discovery...
netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Could not enable Network Discovery
) else (
    echo  ✅ Network Discovery enabled
)

echo  ✅ Windows mDNS setup complete
goto mdns_complete

:install_bonjour_alternative
echo.
echo  📦 Installing Bonjour Print Services...
echo  This may not work on newer Windows versions.
echo.
echo  Opening Apple's Bonjour download page...
start https://support.apple.com/downloads/bonjour_for_windows
echo.
echo  Please download and install Bonjour Print Services manually.
echo  After installation, restart your computer.
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
echo  ═══════════════════════════════════════════════════════════════
echo  🎉 mDNS Setup Complete!
echo  ═══════════════════════════════════════════════════════════════
echo.
echo  🚀 Next Steps:
echo  1. Restart your computer (required for mDNS to work properly)
echo  2. Run "Start LANStreamer Server.bat" to start the server
echo  3. Test access with: http://lanstreamer.local:3001/streams
echo.
echo  💡 If mDNS doesn't work after restart:
echo  - Use IP addresses instead: http://[YOUR_IP]:3001/streams
echo  - Check Windows Firewall settings
echo  - Try running this script again
echo.
echo  Press any key to close this window...
pause
