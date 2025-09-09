@echo off
setlocal enabledelayedexpansion
title LANStreamer Windows Hostname Setup
color 0A

:: Change to the directory where this batch file is located
cd /d "%~dp0"

:: Display banner
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              LANStreamer Windows Hostname Setup              ║
echo  ║                  Reliable lanstreamer.local                  ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  This will set up lanstreamer.local to work reliably on Windows
echo  by combining static IP configuration with hosts file entry.
echo.

:: Check if running as administrator
net session >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  WARNING: Not running as Administrator
    echo  This setup requires Administrator privileges.
    echo.
    echo  Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo  ✅ Running as Administrator
echo.

:: Get current IP address
echo  🔍 Detecting current network configuration...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "current_ip=%%a"
    set "current_ip=!current_ip: =!"
    goto :found_ip
)

:found_ip
if "!current_ip!"=="" (
    echo  ❌ Could not detect current IP address
    echo  Please ensure you're connected to a network
    pause
    exit /b 1
)

echo  📍 Current IP Address: !current_ip!
echo.

:: Ask user about static IP setup
echo  🌐 Network Configuration Options:
echo.
echo  1. Use current IP (!current_ip!) and add to hosts file
echo  2. Set up static IP first, then add to hosts file
echo  3. Cancel setup
echo.
set /p setup_choice="Enter your choice (1, 2, or 3): "

if "!setup_choice!"=="1" goto add_to_hosts
if "!setup_choice!"=="2" goto static_ip_guide
if "!setup_choice!"=="3" goto cancel_setup
goto invalid_choice

:static_ip_guide
echo.
echo  📋 Static IP Setup Instructions:
echo.
echo  1. Press Win + R, type "ncpa.cpl", press Enter
echo  2. Right-click your network adapter → Properties
echo  3. Double-click "Internet Protocol Version 4 (TCP/IPv4)"
echo  4. Select "Use the following IP address"
echo  5. Enter these values:
echo     - IP Address: 192.168.1.100 (or choose your preferred IP)
echo     - Subnet Mask: 255.255.255.0
echo     - Default Gateway: 192.168.1.1 (your router's IP)
echo     - DNS: 8.8.8.8 and 8.8.4.4
echo.
echo  📖 For detailed instructions, see: docs\NETWORK-SETUP.md
echo.
set /p static_ip="After setting static IP, enter the IP you chose: "

if "!static_ip!"=="" (
    echo  ❌ No IP address entered
    pause
    exit /b 1
)

set "current_ip=!static_ip!"
goto add_to_hosts

:add_to_hosts
echo.
echo  📝 Adding lanstreamer.local to Windows hosts file...
echo  IP Address: !current_ip!
echo.

:: Check if entry already exists
findstr /c:"lanstreamer.local" C:\Windows\System32\drivers\etc\hosts >nul 2>&1
if not errorlevel 1 (
    echo  ⚠️  Entry already exists in hosts file
    echo  Removing old entry first...
    
    :: Create temporary file without the lanstreamer.local line
    findstr /v /c:"lanstreamer.local" C:\Windows\System32\drivers\etc\hosts > C:\Windows\System32\drivers\etc\hosts.tmp
    move C:\Windows\System32\drivers\etc\hosts.tmp C:\Windows\System32\drivers\etc\hosts
)

:: Add new entry
echo !current_ip! lanstreamer.local >> C:\Windows\System32\drivers\etc\hosts

if errorlevel 1 (
    echo  ❌ Failed to update hosts file
    echo  Please check Administrator privileges
    pause
    exit /b 1
)

echo  ✅ Successfully added lanstreamer.local to hosts file
echo.

:: Test the setup
echo  🧪 Testing hostname resolution...
ping -n 1 lanstreamer.local >nul 2>&1
if errorlevel 1 (
    echo  ⚠️  Warning: lanstreamer.local is not resolving yet
    echo  This might be normal - try restarting your browser
) else (
    echo  ✅ lanstreamer.local is resolving correctly!
)

echo.
echo  🎉 Setup Complete!
echo.
echo  📋 What was configured:
echo  • Added "!current_ip! lanstreamer.local" to Windows hosts file
echo  • lanstreamer.local will now always point to !current_ip!
echo  • This works even after router reboots (if using static IP)
echo.
echo  🌐 Your LANStreamer URLs:
echo  • Admin Dashboard: http://lanstreamer.local:3001
echo  • Streams Page: http://lanstreamer.local:3001/streams
echo  • Backup (IP): http://!current_ip!:3001/streams
echo.
echo  💡 Next Steps:
echo  1. Start LANStreamer: Double-click "Start LANStreamer Server.bat"
echo  2. Test access from other devices on your network
echo  3. Share the URL: http://lanstreamer.local:3001/streams
echo.
goto end_script

:invalid_choice
echo  ❌ Invalid choice. Please enter 1, 2, or 3.
pause
exit /b 1

:cancel_setup
echo.
echo  ❌ Setup cancelled by user
echo.
goto end_script

:end_script
echo  Press any key to exit...
pause >nul
