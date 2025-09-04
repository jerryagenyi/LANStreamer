#!/bin/bash

echo ""
echo "========================================"
echo "   LANStreamer Screenshot Generator"
echo "========================================"
echo ""

echo "Installing Puppeteer (if needed)..."
npm install puppeteer --save-dev

echo ""
echo "Starting LANStreamer server..."
npm run dev &
SERVER_PID=$!

echo ""
echo "Waiting for server to start..."
sleep 10

echo ""
echo "Generating screenshots..."
npm run screenshots

echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "Screenshots generated successfully!"
echo "Check the images/screenshots/ folder for the new images."
echo ""
