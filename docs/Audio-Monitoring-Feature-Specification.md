# Audio Monitoring Feature Specification

## Overview

The Audio Monitoring feature enables Event Admins to listen to live audio streams through local output devices for quality control purposes. This is essential for professional live event management where stream quality must be verified before broadcasting to listeners.

**Related Documentation:**
- [Product Requirements](LANStreamer-PRD.md) - User story and business requirements for monitoring feature
- [Technical Specification](LANStreamer-Technical-Specification.md) - Core system architecture and API details
- [UI Design Specification](Admin-Dashboard-UI-Design.md) - Visual design for monitoring controls and interface
- [TDD Plan](LANStreamer-TDD.md) - Testing strategy for monitoring feature implementation

## User Story

> **As an Event Admin,** I want to be able to monitor any live audio stream on a specific output device so I can check its quality before broadcasting to listeners.

## Technical Requirements

### 1. Audio Device Detection Enhancement

#### Current Behavior
- `/api/system/audio-devices` returns all detected audio devices
- No differentiation between input and output devices

#### Enhanced Behavior
- API must return devices with `type` field indicating "input" or "output"
- Input devices: microphones, line inputs, virtual audio cables (input side)
- Output devices: speakers, headphones, virtual audio cables (output side)

#### API Response Format
```json
{
  "devices": [
    {
      "id": "device-1",
      "name": "Microphone (USB Audio Device)",
      "type": "input",
      "channels": 2,
      "sampleRate": 44100
    },
    {
      "id": "device-2", 
      "name": "Speakers (Realtek Audio)",
      "type": "output",
      "channels": 2,
      "sampleRate": 44100
    }
  ]
}
```

### 2. New API Endpoint: Stream Monitoring

#### Endpoint: `POST /api/streams/monitor`

**Purpose:** Start monitoring a live stream through a specified output device

**Request Body:**
```json
{
  "streamId": "stream_123456",
  "outputDeviceId": "device-2",
  "action": "start" // or "stop"
}
```

**Response:**
```json
{
  "success": true,
  "monitoringId": "monitor_789012",
  "message": "Stream monitoring started on Speakers (Realtek Audio)"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Stream not found or not running",
  "code": "STREAM_NOT_ACTIVE"
}
```

### 3. FFmpeg Implementation

#### Primary Stream Process
The main streaming process remains unchanged, sending audio to Icecast.

#### Secondary Monitoring Process
When monitoring is enabled, a secondary FFmpeg process is spawned:

```bash
ffmpeg -f dshow -i audio="Input Device Name" -f wasapi default:RENDER:"Output Device Name" -filter:a "volume=0.8"
```

**Key Points:**
- Independent process from main stream
- Does not interfere with stream quality or performance
- Includes volume control to prevent feedback
- Automatically terminated when main stream stops

### 4. Process Management

#### Monitoring Process Lifecycle
1. **Start:** Secondary FFmpeg process spawned when monitoring enabled
2. **Monitor:** Process health checked alongside main stream
3. **Stop:** Process terminated when:
   - User unchecks monitoring
   - Main stream stops
   - Output device disconnected
   - System shutdown

#### Resource Management
- Maximum concurrent monitoring sessions: 4 (configurable)
- Memory usage monitoring for secondary processes
- Automatic cleanup on failure

## UI Implementation

### Stream Panel Enhancement

#### Current Stream Panel
```
[Stream Name Input]
[Audio Device Dropdown]
[Start/Stop Toggle] [Status: Live]
```

#### Enhanced Stream Panel
```
[Stream Name Input]
[Audio Input Source Dropdown] ← Only input devices
☐ Monitor this Stream
    [Monitoring Output Device Dropdown] ← Only output devices (conditional)
[Start/Stop Toggle] [Status: Live + Monitoring]
[Device Permission Status] ← Browser permission indicator
```

### UI Behavior

#### Monitoring Checkbox
- **Unchecked (default):** Monitoring dropdown hidden
- **Checked:** Monitoring dropdown visible with output devices
- **Disabled when:** Stream is not running or device permissions not granted
- **Permission dependency:** Requires browser audio permissions to be granted

#### Monitoring Dropdown
- **Population:** Only devices with `type: "output"` (requires browser permissions)
- **Visibility:** Controlled by monitoring checkbox and permission status
- **Placeholder:** "Select monitoring device..." or "Grant audio permissions first"
- **Permission State:** Greyed out if browser permissions not granted
- **Error State:** Red border if selected device disconnected

#### Status Indicators
- **Offline:** Stream not running
- **Starting...:** Stream starting up
- **Live:** Stream active, no monitoring
- **Live + Monitoring:** Stream active with monitoring enabled
- **Monitoring Error:** Stream live but monitoring failed

### Visual Design Elements

#### Monitoring Section Styling
```css
.monitoring-section {
  margin-top: 12px;
  padding: 12px;
  background: rgba(0, 123, 255, 0.1);
  border-left: 3px solid #007bff;
  border-radius: 4px;
}

.monitoring-checkbox {
  margin-bottom: 8px;
}

.monitoring-dropdown {
  width: 100%;
  transition: opacity 0.3s ease;
}
```

#### Status Icon Enhancement
- **Monitor Active:** 🎧 icon next to status text
- **Monitor Error:** ⚠️ icon with tooltip explaining issue
- **Volume Indicator:** Visual volume meter for monitoring signal

## Error Handling

### Common Error Scenarios

#### 1. Browser Permissions Not Granted
- **Detection:** `getUserMedia()` API call fails
- **UI Response:** Show permission request button, disable monitoring controls
- **User Action:** "Grant Audio Permissions" button triggers permission dialog

#### 2. Output Device Disconnected During Monitoring
- **Detection:** Monitor FFmpeg process exit
- **UI Response:** Show warning icon, disable monitoring dropdown
- **User Action:** Notification with option to select new device

#### 2. Monitoring Process Fails to Start
- **Detection:** FFmpeg spawn error
- **UI Response:** Show error message, uncheck monitoring checkbox
- **Logging:** Detailed error in server logs

#### 3. Audio Feedback Risk
- **Prevention:** Volume limiting in FFmpeg process
- **Detection:** Audio level monitoring
- **Protection:** Automatic volume reduction or process termination

### Error Messages

#### User-Friendly Messages
- "Audio permissions required. Please allow microphone access in your browser."
- "Monitoring device disconnected. Please select a new device."
- "Unable to start monitoring. Check device availability."
- "Monitoring stopped to prevent audio feedback."
- "Browser permissions denied. Enable audio access in browser settings and refresh."

## Configuration

### Environment Variables
```env
# Monitoring Configuration
MAX_CONCURRENT_MONITORING=4
MONITORING_VOLUME_LIMIT=0.8
MONITORING_TIMEOUT_MS=5000
ENABLE_MONITORING_FEATURE=true
```

### Runtime Configuration
- Maximum monitoring sessions per stream: 1
- Default monitoring volume: 80%
- Monitoring process timeout: 5 seconds
- Auto-cleanup interval: 30 seconds

## Testing Strategy

### Unit Tests
- AudioDeviceService device type detection
- Monitoring API endpoint validation
- FFmpeg monitoring process spawning

### Integration Tests
- Main stream + monitoring process interaction
- Device disconnection handling
- Process cleanup verification

### E2E Tests
- Complete monitoring workflow in browser
- UI state management (checkbox, dropdown, status)
- Multiple stream monitoring scenarios

## Implementation Priority

### Phase 1: Core Functionality
1. ✅ Update AudioDeviceService for device type detection
2. ✅ Create monitoring API endpoint
3. ✅ Implement FFmpeg monitoring process management

### Phase 2: UI Integration
1. ✅ Update dashboard UI with monitoring controls
2. ✅ Implement conditional dropdown visibility  
3. ✅ Add monitoring status indicators
4. ✅ Integrate browser permission handling
5. ✅ Add permission-aware UI states

### Phase 3: Error Handling & Polish
1. ⏳ Implement comprehensive error handling
2. ⏳ Add monitoring volume controls
3. ⏳ Performance optimization and testing

## Future Enhancements

### v1.1 Potential Features
- **Volume Control:** Slider for monitoring volume adjustment
- **Multi-Output:** Monitor single stream to multiple outputs
- **Recording:** Record monitoring sessions for quality logs
- **Visualization:** Audio level meters for monitoring streams

This specification provides a comprehensive roadmap for implementing professional-grade audio monitoring capabilities in LANStreamer.
