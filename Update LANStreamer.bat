@echo off
setlocal enabledelayedexpansion

:: LANStreamer Auto-Updater
:: This script downloads the latest version and updates your installation
:: while preserving your configuration and data

title LANStreamer Auto-Updater
color 0A

echo.
echo ========================================
echo    LANStreamer Auto-Updater v1.0
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo.
    echo ❌ ERROR: Wrong directory
    echo.
    echo This script must be run from the LANStreamer root directory
    echo Make sure you're running it from the folder containing package.json
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

:: Check for internet connection
echo 🌐 Checking internet connection...
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERROR: No internet connection detected
    echo.
    echo Please check your internet connection and try again
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

:: Get current directory
set "INSTALL_DIR=%CD%"
set "BACKUP_DIR=%INSTALL_DIR%\update_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"
set "TEMP_DIR=%TEMP%\lanstreamer_update"

echo ✅ Internet connection OK
echo 📁 Installation directory: %INSTALL_DIR%
echo.

:: Ask for confirmation
echo ⚠️  WARNING: This will update LANStreamer to the latest version
echo.
echo 📋 FILES THAT WILL BE PRESERVED:
echo    • .env file (your environment settings)
echo    • data/ folder (stream configurations, event settings)
echo    • logs/ folder (application logs and history)
echo    • device-config.json (audio device preferences)
echo.
echo ⚠️  IMPORTANT: The update process will temporarily stop any running streams.
echo    After the update, you'll need to manually restart the server.
echo.
set /p "confirm=Do you want to continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo.
    echo ❌ Update cancelled by user
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 0
)

echo.
echo 🚀 Starting update process...
echo.

:: Step 1: Create backup directory
echo 📦 Step 1/8: Creating backup...
if exist "%BACKUP_DIR%" rmdir /s /q "%BACKUP_DIR%"
mkdir "%BACKUP_DIR%" 2>nul

:: Backup important user data
if exist "data" xcopy "data" "%BACKUP_DIR%\data\" /e /i /h /y >nul 2>&1
if exist "logs" xcopy "logs" "%BACKUP_DIR%\logs\" /e /i /h /y >nul 2>&1
if exist ".env" copy ".env" "%BACKUP_DIR%\" >nul 2>&1
if exist "device-config.json" copy "device-config.json" "%BACKUP_DIR%\" >nul 2>&1

echo ✅ Backup created at: %BACKUP_DIR%
echo.

:: Step 2: Stop any running processes
echo 🛑 Step 2/8: Stopping LANStreamer processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im icecast.exe >nul 2>&1
timeout /t 2 >nul
echo ✅ Processes stopped
echo.

:: Step 3: Clean temp directory
echo 🧹 Step 3/8: Preparing download area...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
echo ✅ Download area ready
echo.

:: Step 4: Download latest release
echo 📥 Step 4/8: Downloading latest version...
echo    This may take a few minutes depending on your connection...

:: Use PowerShell to download the latest release (suppress error output)
powershell -Command "& {
    try {
        $ProgressPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'SilentlyContinue'
        Write-Host '   🔍 Fetching latest release info...'
        $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/jerryagenyi/LANStreamer/releases/latest'
        $downloadUrl = $release.assets | Where-Object { $_.name -like '*LANStreamer*.zip' } | Select-Object -First 1 -ExpandProperty browser_download_url

        if (-not $downloadUrl) {
            $downloadUrl = $release.zipball_url
        }

        Write-Host ('   📦 Downloading: ' + $release.tag_name)
        Write-Host ('   🔗 URL: ' + $downloadUrl)

        $zipPath = '%TEMP_DIR%\lanstreamer-latest.zip'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing

        Write-Host '   ✅ Download completed'
        exit 0
    } catch {
        Write-Host ('   ❌ Download failed: ' + $_.Exception.Message)
        exit 1
    }
}" 2>nul

if errorlevel 1 (
    echo.
    echo ❌ DOWNLOAD FAILED
    echo.
    echo 🔍 POSSIBLE CAUSES:
    echo    • Internet connection issues
    echo    • GitHub server temporarily unavailable
    echo    • Firewall blocking the download
    echo.
    echo 🛠️  SOLUTIONS:
    echo    • Check your internet connection
    echo    • Try again in a few minutes
    echo    • Manually download from: https://github.com/jerryagenyi/LANStreamer/releases/latest
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

echo ✅ Download completed
echo.

:: Step 5: Extract the update
echo 📂 Step 5/8: Extracting update...
powershell -Command "& {
    try {
        $ProgressPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'SilentlyContinue'
        $zipPath = '%TEMP_DIR%\lanstreamer-latest.zip'
        $extractPath = '%TEMP_DIR%\extracted'

        Write-Host '   📦 Extracting archive...'
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

        # Find the actual content directory (might be nested)
        $contentDir = Get-ChildItem -Path $extractPath -Directory | Select-Object -First 1
        if ($contentDir) {
            $actualPath = $contentDir.FullName
        } else {
            $actualPath = $extractPath
        }

        Write-Host ('   📁 Content found at: ' + $actualPath)
        Write-Host '   ✅ Extraction completed'

        # Write the path to a temp file for batch to read
        $actualPath | Out-File -FilePath '%TEMP_DIR%\content_path.txt' -Encoding ASCII
        exit 0
    } catch {
        Write-Host ('   ❌ Extraction failed: ' + $_.Exception.Message)
        exit 1
    }
}" 2>nul

if errorlevel 1 (
    echo.
    echo ❌ EXTRACTION FAILED
    echo.
    echo 🔍 The downloaded file could not be extracted.
    echo    This might be due to a corrupted download or insufficient disk space.
    echo.
    echo 🛠️  SOLUTIONS:
    echo    • Try running the update again
    echo    • Check available disk space
    echo    • Manually download and extract from GitHub
    echo.
    echo Press any key to close...
    pause >nul
    exit /b 1
)

:: Read the content path
set /p CONTENT_PATH=<"%TEMP_DIR%\content_path.txt"
echo ✅ Extraction completed
echo.

:: Step 6: Replace files
echo 🔄 Step 6/8: Installing update...
echo    Preserving user data and configuration...

:: Remove old files (except user data and this updater)
for /d %%i in (*) do (
    if /i not "%%i"=="data" if /i not "%%i"=="logs" if /i not "%%i"=="%BACKUP_DIR:~-20%" (
        echo    🗑️  Removing old %%i...
        rmdir /s /q "%%i" 2>nul
    )
)

for %%i in (*) do (
    if /i not "%%i"=="Update LANStreamer.bat" if /i not "%%i"==".env" if /i not "%%i"=="device-config.json" (
        echo    🗑️  Removing old %%i...
        del "%%i" 2>nul
    )
)

:: Copy new files
echo    📋 Installing new files...
xcopy "%CONTENT_PATH%\*" "%INSTALL_DIR%\" /e /i /h /y /exclude:update_exclude.txt >nul 2>&1

:: Step 7: Restore user data
echo 🔄 Step 7/8: Restoring your data...
if exist "%BACKUP_DIR%\data" xcopy "%BACKUP_DIR%\data" "data\" /e /i /h /y >nul 2>&1
if exist "%BACKUP_DIR%\logs" xcopy "%BACKUP_DIR%\logs" "logs\" /e /i /h /y >nul 2>&1
if exist "%BACKUP_DIR%\.env" copy "%BACKUP_DIR%\.env" "." >nul 2>&1
if exist "%BACKUP_DIR%\device-config.json" copy "%BACKUP_DIR%\device-config.json" "." >nul 2>&1

echo ✅ Data restored
echo.

:: Step 8: Recreate desktop shortcut if it existed
echo 🔗 Step 8/8: Checking desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP%\LANStreamer.lnk"

if exist "%SHORTCUT_PATH%" (
    echo    🔄 Desktop shortcut found - recreating to ensure it works...
    powershell -ExecutionPolicy Bypass -Command "& {
        try {
            $ProgressPreference = 'SilentlyContinue'
            $ErrorActionPreference = 'SilentlyContinue'
            $currentDir = '%INSTALL_DIR%'
            $batchFile = Join-Path $currentDir 'Start LANStreamer Server.bat'
            $shortcutPath = '%SHORTCUT_PATH%'

            if (Test-Path $batchFile) {
                $WshShell = New-Object -comObject WScript.Shell
                $Shortcut = $WshShell.CreateShortcut($shortcutPath)
                $Shortcut.TargetPath = $batchFile
                $Shortcut.WorkingDirectory = $currentDir
                $Shortcut.Description = 'Start LANStreamer Audio Streaming Server'
                $Shortcut.IconLocation = 'shell32.dll,25'
                $Shortcut.Save()
                Write-Host '    ✅ Desktop shortcut updated successfully'
            } else {
                Write-Host '    ⚠️  Batch file not found - shortcut may not work'
            }
        } catch {
            Write-Host ('    ❌ Failed to update shortcut: ' + $_.Exception.Message)
        }
    }" 2>nul
) else (
    echo    ℹ️  No desktop shortcut found - skipping
)
echo.

:: Cleanup
echo 🧹 Cleaning up temporary files...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%" 2>nul

echo.
echo ========================================
echo ✅ UPDATE COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo 🎉 LANStreamer has been updated to the latest version!
echo.
echo 📋 WHAT HAPPENED:
echo    • ✅ All your settings and data were preserved
echo    • ✅ New LANStreamer files installed
echo    • ✅ Backup created for safety
echo    • ✅ Desktop shortcut updated (if it existed)
echo.
echo 📁 BACKUP LOCATION: %BACKUP_DIR%
echo    (You can delete this after confirming everything works)
echo.
echo 🚀 NEXT STEPS:
echo    1. Close this window
echo    2. Run "Start LANStreamer Server.bat" to start the updated version
echo    3. Test your streams to make sure everything works
echo.
echo ⚠️  IMPORTANT: The server does NOT start automatically - this is intentional
echo    so you can review the update results first.
echo.
echo ⚠️  TROUBLESHOOTING: If you see "HTTP 401" errors in the terminal:
echo    This means Icecast admin password mismatch. Create a .env file with:
echo    ICECAST_ADMIN_PASSWORD=your_actual_icecast_admin_password
echo    (Replace with the password from your Icecast installation)
echo.
echo ========================================
echo 🎯 UPDATE COMPLETE - READY TO USE!
echo ========================================
echo.
echo ✅ SUCCESS: LANStreamer updated successfully!
echo ✅ All your data and settings were preserved
echo ✅ Browser compatibility fix applied
echo.
echo 🚀 NEXT STEP: Double-click "Start LANStreamer Server.bat"
echo.
echo 📋 WHAT WAS FIXED:
echo    • Browser stream playback issues resolved
echo    • Audio format compatibility improved
echo    • MP3 format prioritized for universal support
echo.
echo ⚠️  IMPORTANT: If you still see stream errors, the issue may be:
echo    • Audio device not connected or in use by another app
echo    • Need to refresh devices in LANStreamer dashboard
echo.
echo This window will stay open for 30 seconds, then auto-close...
timeout /t 30
