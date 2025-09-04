# Default Lobby Music Setup

## Missing Default Music File

The system is configured to use `default-lobby-music.mp3` as the default background music file, but this file is not currently present.

## How to Add Default Music File

### Option 1: Download Royalty-Free Music
1. Visit one of these royalty-free music sources:
   - **Pixabay Music**: https://pixabay.com/music/
   - **Creative Commons**: https://creativecommons.org/legalmusicforvideos/
   - **Free Music Archive**: https://freemusicarchive.org/
   - **YouTube Audio Library**: https://studio.youtube.com/channel/UC.../music

2. Download a suitable background music track (MP3 format)
3. Rename the file to `default-lobby-music.mp3`
4. Place it in this directory: `/public/assets/`

### Option 2: Use Your Own Music
1. Choose any MP3 file you own or have rights to use
2. Rename it to `default-lobby-music.mp3`
3. Place it in this directory: `/public/assets/`

### Recommended Characteristics
- **Format**: MP3
- **Duration**: 2-10 minutes (will loop automatically)
- **Style**: Ambient, instrumental, non-distracting
- **Volume**: Moderate (users can adjust volume)
- **Quality**: 128kbps or higher

## Current Behavior
- **Without default file**: Users must upload their own music files
- **With default file**: System loads "Default Lobby Music" automatically
- **User uploads**: Always take priority over default file

## File Structure
```
public/
├── assets/
│   ├── default-lobby-music.mp3  ← Add this file
│   └── README-DEFAULT-MUSIC.md  ← This file
└── uploads/
    └── music/                   ← User uploaded files
```

## Testing
After adding the file:
1. Refresh the application
2. You should see "Default Lobby Music" loaded
3. Play button should work without errors
4. Users can still upload their own files which will override the default
