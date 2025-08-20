@echo off
setlocal

:: ====================================================================
:: === FFmpeg Live Streaming Script ===
:: ====================================================================
:: This script uses FFmpeg to capture audio from a specified Windows
:: DirectShow device and stream it to an Icecast server.
::
:: You can edit the variables below to easily change your audio source
:: and streaming settings without modifying the main command.
:: ====================================================================

:: === CONFIGURATION VARIABLES ===
:: Set this to the exact name of your audio input device.
:: You can find this name by running: ffmpeg -list_devices true -f dshow -i dummy
set "AUDIO_DEVICE=Microphone Array (Intel® Smart Sound Technology for Digital Microphones)"
:: If the DVS is working, you can change this to:
:: set "AUDIO_DEVICE=DVS Receive 1-2 (Dante Virtual Soundcard)"

:: Set your Icecast server details (change 'localhost' to your server IP if needed or planning to access from other devices)
set "ICECAST_HOST=localhost"
set "ICECAST_PORT=8000"
set "ICECAST_USER=source"
set "ICECAST_PASSWORD=hackme"
set "ICECAST_MOUNT=/stream.mp3"

:: Set your audio encoding settings
set "AUDIO_RATE=44100"
set "AUDIO_CHANNELS=2"
set "AUDIO_BITRATE=128k"
set "AUDIO_FORMAT=mp3"

:: ====================================================================
:: === DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU'RE DOING ===
:: ====================================================================

echo Starting stream from "%AUDIO_DEVICE%" to Icecast server...
echo.

ffmpeg -f dshow -i audio="%AUDIO_DEVICE%" ^
-ar %AUDIO_RATE% ^
-ac %AUDIO_CHANNELS% ^
-b:a %AUDIO_BITRATE% ^
-f %AUDIO_FORMAT% ^
icecast://%ICECAST_USER%:%ICECAST_PASSWORD%@%ICECAST_HOST%:%ICECAST_PORT%%ICECAST_MOUNT%

endlocal
