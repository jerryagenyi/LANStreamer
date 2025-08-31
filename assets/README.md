# Assets Directory

This directory contains audio assets and other media files used by the LANStreamer application.

## Contents

- **Slack-Huddle-Hold-Music_Daniel-Simmons.mp3** - Sample audio file for testing stream functionality

## Audio File Usage Strategy

### Production Mode (Default)
LANStreamer **automatically detects and uses your system's default audio devices**:
- **Input**: System default microphone or audio interface
- **Output**: System default speakers or headphones (for monitoring)
- **Advantage**: Works immediately with any PC setup, no configuration required

### Test Mode (Development/Demo)
The sample audio file is used for:

#### 1. **Automated Testing**
- E2E tests use the MP3 file to ensure consistent, predictable audio streams
- Testing doesn't rely on physical microphones or external audio sources
- Continuous Integration environments can test audio functionality

#### 2. **Development Demonstrations**
- Provides immediate audio content for showcasing streaming capabilities
- Eliminates need for live microphone input during development
- Consistent audio quality for testing stream encoding and playback

#### 3. **Fallback/Demo Mode**
- Optional "Demo Mode" where users can test the system without live audio
- Useful for trade shows, presentations, or initial system validation
- Allows testing the complete streaming pipeline without audio hardware

### Implementation Strategy

The recommended approach is:

1. **Default Behavior**: Use system default audio devices (current implementation)
2. **Optional Test Mode**: Add environment variable `USE_TEST_AUDIO=true` for demo/testing
3. **User Choice**: UI option to "Use Demo Audio" for testing streams

This maintains simplicity while providing flexibility for different use cases.

## Configuration

### Environment Variables
```env
# Enable test audio file instead of default microphone
USE_TEST_AUDIO=false

# Path to test audio file (relative to project root)
TEST_AUDIO_FILE=./assets/Slack-Huddle-Hold-Music_Daniel-Simmons.mp3
```

### When to Use Test Audio
- **✅ Use for**: Automated testing, demonstrations, development
- **❌ Don't use for**: Production live events, actual interpretation

## Technical Notes

- **File Format**: MP3, compatible with FFmpeg input
- **Duration**: Loops automatically when used as test input
- **Quality**: Suitable for testing stream encoding and playback
- **Size**: Included in repository for development convenience

The sample audio provides a consistent, known-good audio source that allows developers and users to verify the complete audio streaming pipeline without requiring live microphone input or complex audio routing setup.
