@echo off
echo.
echo ========================================
echo   LANStreamer Screenshot Generator
echo ========================================
echo.

echo Installing Puppeteer (if needed)...
npm install puppeteer --save-dev

echo.
echo Starting LANStreamer server...
start /B npm run dev

echo.
echo Waiting for server to start...
timeout /t 10 /nobreak > nul

echo.
echo Generating screenshots...
npm run screenshots

echo.
echo Screenshots generated successfully!
echo Check the images/screenshots/ folder for the new images.
echo.
pause
