@echo off
title LANStreamer - Create Desktop Shortcut
color 0A

echo.
echo ========================================
echo    LANStreamer Desktop Shortcut Creator
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "Start LANStreamer Server.bat" (
    echo ❌ ERROR: Wrong directory
    echo.
    echo Please run this from the LANStreamer folder
    echo ^(the folder containing "Start LANStreamer Server.bat"^)
    echo.
    pause
    exit /b 1
)

:: Get paths
set "INSTALL_DIR=%CD%"
set "BATCH_FILE=%INSTALL_DIR%\Start LANStreamer Server.bat"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP%\LANStreamer.lnk"

:: Check if shortcut already exists
if exist "%SHORTCUT_PATH%" (
    echo ⚠️  A shortcut already exists on your desktop.
    set /p "overwrite=Do you want to replace it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo.
        echo ❌ Cancelled - existing shortcut kept.
        echo.
        pause
        exit /b 0
    )
)

echo 🔧 Creating desktop shortcut...

:: Create shortcut using PowerShell
powershell -ExecutionPolicy Bypass -Command "& {
    try {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%')
        $Shortcut.TargetPath = '%BATCH_FILE%'
        $Shortcut.WorkingDirectory = '%INSTALL_DIR%'
        $Shortcut.Description = 'Start LANStreamer Audio Streaming Server'
        $Shortcut.IconLocation = 'shell32.dll,25'
        $Shortcut.Save()
        Write-Host '✅ Desktop shortcut created successfully!' -ForegroundColor Green
    } catch {
        Write-Host ('❌ Failed: ' + $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
}"

if errorlevel 1 (
    echo.
    echo ❌ Failed to create shortcut.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ SHORTCUT CREATED!
echo ========================================
echo.
echo 📍 Location: %SHORTCUT_PATH%
echo.
echo 💡 You can now double-click "LANStreamer" on your desktop
echo    to start the streaming server anytime!
echo.
pause
