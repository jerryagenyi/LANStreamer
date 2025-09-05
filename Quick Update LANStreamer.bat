@echo off
title LANStreamer Quick Update
color 0B

echo.
echo 🚀 LANStreamer Quick Update
echo ===========================
echo.
echo This will quickly update LANStreamer while preserving your settings.
echo.

:: Quick checks
if not exist "package.json" (
    echo ❌ Run this from the LANStreamer folder
    pause & exit /b 1
)

ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    echo ❌ No internet connection
    pause & exit /b 1
)

echo ✅ Starting quick update...
echo.

:: Stop processes
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im icecast.exe >nul 2>&1

:: Quick backup of critical files
if not exist "quick_backup" mkdir "quick_backup"
if exist ".env" copy ".env" "quick_backup\" >nul 2>&1
if exist "config\icecast.xml" copy "config\icecast.xml" "quick_backup\" >nul 2>&1
if exist "device-config.json" copy "device-config.json" "quick_backup\" >nul 2>&1

:: Download and extract
echo 📥 Downloading latest version...
powershell -Command "& {
    $release = Invoke-RestMethod 'https://api.github.com/repos/jerryagenyi/LANStreamer/releases/latest'
    $url = $release.zipball_url
    Invoke-WebRequest -Uri $url -OutFile 'temp_update.zip'
    Expand-Archive 'temp_update.zip' 'temp_extract' -Force
    $content = Get-ChildItem 'temp_extract' -Directory | Select-Object -First 1
    Copy-Item -Path ($content.FullName + '\*') -Destination '.' -Recurse -Force
    Remove-Item 'temp_update.zip', 'temp_extract' -Recurse -Force
}"

:: Restore critical files
if exist "quick_backup\.env" copy "quick_backup\.env" "." >nul 2>&1
if exist "quick_backup\icecast.xml" copy "quick_backup\icecast.xml" "config\" >nul 2>&1
if exist "quick_backup\device-config.json" copy "quick_backup\device-config.json" "." >nul 2>&1

echo.
echo ✅ Update completed! Your settings have been preserved.
echo 🚀 Run "Start LANStreamer Server.bat" to start the updated version.
echo.
pause
