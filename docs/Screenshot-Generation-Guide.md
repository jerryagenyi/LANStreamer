# Screenshot Generation Guide

This guide explains how to automatically generate screenshots for LANStreamer documentation.

## Overview

LANStreamer includes an automated screenshot generation system that captures images of:
- **Dashboard Interface** (`/`) - Main control panel with system status and stream management
- **Streams Interface** (`/streams`) - User-facing page for browsing and listening to streams

## Quick Start

### Windows
```bash
# Run the automated script
scripts\update-screenshots.bat
```

### Mac/Linux
```bash
# Make script executable and run
chmod +x scripts/update-screenshots.sh
./scripts/update-screenshots.sh
```

### Manual Process
```bash
# 1. Install dependencies
npm install puppeteer --save-dev

# 2. Start LANStreamer server
npm run dev

# 3. In another terminal, generate screenshots
npm run screenshots
```

## Generated Files

Screenshots are saved to `images/screenshots/`:
- `dashboard.png` - Main dashboard interface
- `streams.png` - Streams browsing interface

## Technical Details

### Screenshot Generator (`scripts/generate-screenshots.js`)

The generator uses Puppeteer to:
1. **Launch headless browser** at 1920x1080 resolution
2. **Wait for server** to be ready on `http://localhost:3001`
3. **Navigate to each page** and wait for components to load
4. **Capture full-page screenshots** in PNG format
5. **Save to images/screenshots/** directory

### Configuration

**Browser Settings:**
- Resolution: 1920x1080
- Headless mode: Enabled
- Wait strategy: `networkidle0` (no network requests for 500ms)
- Additional wait: 2 seconds for animations

**Server Requirements:**
- LANStreamer must be running on port 3001
- All components must load successfully
- No authentication required for screenshot pages

## Usage in Documentation

Screenshots are automatically referenced in:
- `README.md` - Main project documentation
- Documentation files in `docs/` directory

**Markdown Usage:**
```markdown
![Dashboard Interface](images/screenshots/dashboard.png)
![Streams Interface](images/screenshots/streams.png)
```

## Troubleshooting

### Common Issues

**"Server not ready" Error:**
- Ensure LANStreamer is running: `npm run dev`
- Check port 3001 is not blocked
- Wait longer for server startup

**"Component not found" Error:**
- Verify all components load properly in browser
- Check for JavaScript errors in console
- Ensure all dependencies are installed

**"Permission denied" Error:**
- Check write permissions on `images/screenshots/` directory
- Run as administrator if needed (Windows)

**Puppeteer Installation Issues:**
- Clear npm cache: `npm cache clean --force`
- Reinstall: `npm uninstall puppeteer && npm install puppeteer --save-dev`
- Check system requirements for Puppeteer

### Manual Verification

1. **Start server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3001`
3. **Verify pages load**: Check both `/` and `/streams`
4. **Check components**: Ensure all UI elements display correctly

## CI/CD Integration

For automated builds, add to your workflow:

```yaml
- name: Generate Screenshots
  run: |
    npm run dev &
    sleep 10
    npm run screenshots
    kill %1
```

## Best Practices

### When to Update Screenshots

- **UI Changes**: Any visual modifications to interfaces
- **New Features**: Addition of new components or pages
- **Bug Fixes**: Visual bug fixes that affect appearance
- **Release Preparation**: Before major releases

### Quality Guidelines

- **Consistent State**: Ensure consistent data/state for screenshots
- **Clean Interface**: No error messages or loading states
- **Representative Content**: Show realistic usage scenarios
- **High Resolution**: Use 1920x1080 for clarity

### Maintenance

- **Regular Updates**: Update screenshots monthly or with releases
- **Version Control**: Commit screenshot changes with related code
- **File Size**: Optimize PNG files if they become too large
- **Naming Convention**: Use descriptive, consistent filenames

## Advanced Configuration

### Custom Screenshot Settings

Edit `scripts/generate-screenshots.js` to modify:
- **Resolution**: Change `defaultViewport` settings
- **Wait Times**: Adjust timeout values
- **File Format**: Switch between PNG/JPEG
- **Quality Settings**: Modify compression options

### Additional Pages

To screenshot additional pages, add to the generator:

```javascript
async screenshotCustomPage() {
    await this.page.goto(`${this.baseUrl}/custom-page`);
    await this.page.waitForSelector('.main-content');
    await this.page.screenshot({
        path: path.join(this.outputDir, 'custom-page.png'),
        fullPage: true
    });
}
```

## Support

For issues with screenshot generation:
1. Check this guide first
2. Verify LANStreamer runs correctly
3. Test Puppeteer installation
4. Create GitHub issue with error details
