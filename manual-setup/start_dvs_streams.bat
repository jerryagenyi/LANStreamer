@echo off
setlocal enabledelayedexpansion

:: ====================================================================
:: === LANStreamer DVS Multi-Stream Configuration ===
:: ====================================================================
:: Configure your settings here - no need to edit the FFmpeg commands below
:: ====================================================================

:: === ICECAST SERVER SETTINGS ===
:: Manual IP override - set this if auto-detection doesn't work or you need a specific network adapter
:: NOTE: Script auto-detects 192.168.x.x addresses. If you're using 10.x.x.x or 172.16-31.x.x networks,
::       or have multiple network adapters, uncomment and set your specific IP below:
set "MANUAL_IP="
:: set "MANUAL_IP=192.168.1.100"
:: set "MANUAL_IP=10.0.0.100"
:: set "MANUAL_IP=172.16.0.100"

:: Auto-detect IP or use manual override
if defined MANUAL_IP (
    set "ICECAST_HOST=%MANUAL_IP%"
    echo Using manual IP: %MANUAL_IP%
) else (
    echo Auto-detecting LAN IP address (looking for 192.168.x.x)...
    for /f "tokens=2 delims=: " %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        set "TEMP_IP=%%a"
        set "TEMP_IP=!TEMP_IP: =!"
        echo Checking IP: !TEMP_IP!
        echo !TEMP_IP! | findstr /r "^192\.168\." >nul
        if !errorlevel! equ 0 (
            set "ICECAST_HOST=!TEMP_IP!"
            echo Found LAN IP: !TEMP_IP!
            goto :ip_found
        )
    )
    :ip_found
    if not defined ICECAST_HOST (
        echo WARNING: No 192.168.x.x IP found! Using localhost - LAN access will not work.
        echo Please set MANUAL_IP variable with your correct IP address.
        set "ICECAST_HOST=localhost"
    )
)

set "ICECAST_PORT=8000"
set "ICECAST_USER=source"
set "ICECAST_PASSWORD=your-source-password"

:: === DVS AUDIO DEVICES ===
:: Update these with your exact DVS device names from: ffmpeg -list_devices true -f dshow -i dummy
set "ENGLISH_DEVICE=DVS Receive  5-6 (Dante Virtual Soundcard)"
set "FRENCH_DEVICE=DVS Receive  7-8 (Dante Virtual Soundcard)"
set "PORTUGUESE_DEVICE=DVS Receive  9-10 (Dante Virtual Soundcard)"
set "ARABIC_DEVICE=DVS Receive 11-12 (Dante Virtual Soundcard)"

:: === FALLBACK DEVICES FOR TESTING ===
:: Uncomment these and comment out DVS devices above for testing
:: set "ENGLISH_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"
:: set "FRENCH_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"
:: set "PORTUGUESE_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"
:: set "ARABIC_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"

:: === AUDIO ENCODING SETTINGS ===
set "AUDIO_BITRATE=128k"
set "SAMPLE_RATE=44100"
set "CHANNELS=1"
set "CODEC=libmp3lame"

:: ====================================================================
:: === STREAMING COMMANDS (DO NOT EDIT BELOW) ===
:: ====================================================================

echo ====================================================================
echo LANStreamer DVS Multi-Stream Setup
echo ====================================================================
echo.
echo Configuration:
echo - Icecast Server: http://%ICECAST_HOST%:%ICECAST_PORT%/
echo - Audio Bitrate: %AUDIO_BITRATE%
echo - Sample Rate: %SAMPLE_RATE% Hz
echo - Channels: %CHANNELS% (Mono)
echo.
echo Devices:
echo - English: %ENGLISH_DEVICE%
echo - French: %FRENCH_DEVICE%
echo - Portuguese: %PORTUGUESE_DEVICE%
echo - Arabic: %ARABIC_DEVICE%
echo.
echo Make sure Icecast is running before continuing!
echo.
pause

echo.
echo Starting streams...
echo.

echo [1/4] Starting English stream...
start "English Stream" /min ffmpeg -f dshow -i audio="%ENGLISH_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "English Interpretation" ^
-ice_description "Live English interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/english

timeout /t 2 /nobreak >nul

echo [2/4] Starting French stream...
start "French Stream" /min ffmpeg -f dshow -i audio="%FRENCH_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "French Interpretation" ^
-ice_description "Live French interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/french

timeout /t 2 /nobreak >nul

echo [3/4] Starting Portuguese stream...
start "Portuguese Stream" /min ffmpeg -f dshow -i audio="%PORTUGUESE_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "Portuguese Interpretation" ^
-ice_description "Live Portuguese interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/portuguese

timeout /t 2 /nobreak >nul

echo [4/4] Starting Arabic stream...
start "Arabic Stream" /min ffmpeg -f dshow -i audio="%ARABIC_DEVICE%" ^
-acodec %CODEC% -b:a %AUDIO_BITRATE% -ar %SAMPLE_RATE% -ac %CHANNELS% ^
-content_type audio/mpeg -ice_name "Arabic Interpretation" ^
-ice_description "Live Arabic interpretation stream" ^
-f mp3 icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%/arabic

echo.
echo ====================================================================
echo All streams started successfully!
echo ====================================================================
echo.
echo Stream URLs:
echo - English: http://%ICECAST_HOST%:%ICECAST_PORT%/english
echo - French: http://%ICECAST_HOST%:%ICECAST_PORT%/french
echo - Portuguese: http://%ICECAST_HOST%:%ICECAST_PORT%/portuguese
echo - Arabic: http://%ICECAST_HOST%:%ICECAST_PORT%/arabic
echo.
echo Icecast Status: http://%ICECAST_HOST%:%ICECAST_PORT%/
echo.
echo Press any key to exit (streams will continue running)...
pause >nul

endlocal
