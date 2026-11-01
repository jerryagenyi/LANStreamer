# LANStreamer Screenshots

This directory contains automatically generated screenshots of the LANStreamer interface.

## Files

- `dashboard.png` - Main dashboard interface showing system status and stream management
- `streams.png` - Streams page interface for browsing and listening to audio streams

## Generating Screenshots

To update the screenshots:

### Windows
```bash
scripts\update-screenshots.bat
```

### Mac/Linux
```bash
chmod +x scripts/update-screenshots.sh
./scripts/update-screenshots.sh
```

### Manual Generation
```bash
# Install puppeteer if needed
npm install puppeteer --save-dev

# Start the server
npm run dev

# In another terminal, generate screenshots
npm run screenshots
```

## Requirements

- LANStreamer server must be running on `http://localhost:3001`
- Puppeteer will be automatically installed as a dev dependency
- Screenshots are captured at 1920x1080 resolution
- Full page screenshots are taken to capture all content

## Notes

- Screenshots are automatically generated during CI/CD processes
- Images are optimized for documentation and README display
- Screenshots should be updated when UI changes are made
- The screenshot generator waits for components to load before capturing
