# Google Stitch Visual Generation Prompt for LANStreamer Dashboard

## Overview
Generate a highly detailed, professional visual mockup of the LANStreamer admin dashboard interface. This is a network monitoring and audio streaming management application with a dark theme inspired by professional network tools.

## Technical Specifications

### Color Palette & Theme
- **Primary Background**: Dark grey (#1a1a1d)
- **Accent Color**: Tech-inspired blue (#007bff)
- **Status Colors**: 
  - Success: Green (#28a745)
  - Warning: Yellow (#ffc107)
  - Error: Red (#dc3545)
  - Security Alert: Bright red (#ff0000)
- **Typography**: Modern sans-serif (Inter/Roboto style)
- **Overall Aesthetic**: Clean, minimalist, professional network monitoring tool

### Layout Structure

#### 1. HEADER (Fixed Top - 80px height)
**Left Side - Logo Section:**
- LANStreamer logo with WiFi/streaming device icon (32px height)
- Logo combines network/WiFi symbol with streaming device in tech blue (#007bff)
- Text "LANStreamer" in bold, modern font (24px)
- Horizontal layout with 12px gap between icon and text
- Subtle hover effect (opacity 0.9)

**Right Side - Status Indicators:**
Four circular status indicators with labels, evenly spaced (24px gaps):

1. **FFmpeg Status** 🎵
   - Circle dot (12px) - Currently RED
   - Label: "FFmpeg"
   - Tooltip on hover: "FFmpeg Not Running"

2. **Icecast Status** 📡 + Toggle Switch
   - Circle dot (12px) - Currently RED
   - Label: "Icecast"
   - Interactive toggle switch (44px x 24px) next to indicator
   - Toggle in OFF position (red background, slider left)
   - Tooltip: "Icecast Server Inactive - Click to Start"

3. **Audio Devices** 🎤
   - Circle dot (12px) - Currently YELLOW
   - Label: "Audio Devices"
   - Tooltip: "Permission Required"

4. **Network Status** 🌐
   - Circle dot (12px) - Currently GREEN
   - Label: "Network"
   - Tooltip: "Network Accessible"

#### 2. SECURITY WARNING (Persistent Notification)
**Position**: Centered below header, top: 80px
**Design**: 
- Small red notification banner (#ff0000 background)
- Rounded bottom corners (8px)
- White text: "⚠️ Default credentials in use Change Password"
- "Change Password" as underlined link
- Box shadow for depth
- Non-dismissible (no X button)
- Compact design (8px vertical padding, 20px horizontal)

#### 3. MAIN CONTENT AREA
**Container**: Max-width 1200px, centered, 32px margins
**Top margin**: 120px (to account for header + security warning)

**Card 0 - Active Streams (TOP PRIORITY)**
- **Title**: "Active Streams" with live green indicator dot
- **Position**: First card, immediately visible
- **Content**: 
  - Empty state message: "No active streams - Start your first stream below"
  - Blue primary button: "Start New Stream" with plus icon
- **Background**: Slightly lighter than main background
- **Border**: Subtle border with 8px rounded corners

**Card 1 - Global Settings**
- **Title**: "Global Settings"
- **Content**: Clean form layout with 16px spacing
  - Text input: "Default Port" with placeholder "3001"
  - Dropdown: "Default Audio Codec" (MP3, AAC, Ogg)
  - Dropdown: "Default Bitrate" (64kbps, 128kbps, 192kbps)
  - Password input: "Stream Password" with show/hide eye icon
  - Toggle switch: "Start Streams on Launch"

**Card 2 - Dependencies & Status**
- **Title**: "Dependencies & Status"
- **Content**: Two sub-sections side by side
  - **FFmpeg Section**: Status lines with checkmarks/crosses
    - "Installed": Red X icon
    - "Running": Red X icon
  - **Icecast Section**: Status lines with checkmarks/crosses
    - "Installed": Green checkmark
    - "Running": Red X icon
- **Collapsible Log Panel**: "View Logs" button

**Card 3 - Audio Devices & Stream Configuration**
- **Title**: "Audio Devices & Stream Configuration"
- **Top-right**: Blue "Refresh Audio Devices" button with refresh icon
- **Permission Status**: Yellow warning: "Browser permissions required"
- **Device List**: Placeholder showing "Click 'Detect Audio Devices' to scan"
- **Stream Configuration Panel**:
  - Stream name input: "French Interpretation"
  - "Audio Input Source" dropdown (disabled - no permissions)
  - "Monitor this Stream" checkbox (unchecked)
  - Toggle switch (OFF position)
  - Status: "Offline"
- **Bottom Actions**: 
  - Blue "Add New Language Stream" button with plus
  - Green "Start All Streams" and Red "Stop All Streams" buttons

#### 4. RESPONSIVE DESIGN NOTES
- **Desktop View**: Multi-column layout as described
- **Mobile Considerations**: Single column, larger touch targets
- **Card Spacing**: 24px gaps between cards
- **Internal Padding**: 24px inside each card

### Visual Style Guidelines

#### Typography Hierarchy
- **Main Headers**: 24px, bold
- **Card Titles**: 20px, semi-bold
- **Body Text**: 14px, regular
- **Labels**: 12px, medium weight
- **Status Text**: 14px, varying weights by importance

#### Interactive Elements
- **Buttons**: 8px border radius, smooth hover transitions
- **Form Fields**: 8px border radius, subtle borders
- **Status Indicators**: 12px circles with smooth color transitions
- **Toggle Switches**: Modern iOS-style switches
- **Cards**: Subtle shadows, 8px border radius

#### Spacing & Layout
- **Card Gaps**: 24px vertical and horizontal
- **Element Spacing**: 16px between related elements
- **Form Spacing**: 16px between form fields
- **Button Spacing**: 12px between action buttons

### Professional Details to Include

#### Micro-interactions (Visual Hints)
- **Hover States**: Subtle background changes on interactive elements
- **Loading States**: Spinner icons where appropriate
- **Focus States**: Blue outline on form fields
- **Active States**: Pressed button effects

#### Network Tool Aesthetics
- **Status Indicators**: Professional monitoring tool style
- **Data Display**: Clean, scannable information layout
- **Warning Elements**: Clear visual hierarchy for alerts
- **Action Buttons**: Clear primary/secondary button distinction

## Output Requirements

### Image Specifications
- **Resolution**: 1200px width minimum for desktop view
- **Format**: High-quality PNG or WebP
- **Aspect Ratio**: 16:10 or 16:9 for desktop mockup
- **Quality**: Professional presentation quality

### Visual Fidelity
- **Typography**: Clean, readable fonts consistent with specifications
- **Colors**: Exact hex values as specified
- **Spacing**: Precise measurements and consistent alignment
- **Shadows**: Subtle, realistic depth effects
- **Icons**: Modern, clean iconography matching the tech aesthetic

### Mockup Context
- **Browser Frame**: Show in browser window context (optional)
- **Screen Context**: Desktop/laptop screen showing the dashboard
- **Professional Setting**: Suggest this is a professional network monitoring tool

## Key Success Criteria

1. **Professional Appearance**: Should look like a real, deployed network monitoring application
2. **Dark Theme Consistency**: All elements should work harmoniously in the dark theme
3. **Clear Information Hierarchy**: Status information should be immediately scannable
4. **Functional Design**: Should look like it actually works and is interactive
5. **Security Prominence**: The security warning should be noticeable without being overwhelming
6. **Brand Consistency**: The LANStreamer logo and brand should feel integrated and professional

## Additional Context
This is for a LANStreamer application that turns PCs into multi-channel audio streaming servers for local networks. Primary users are event administrators managing language interpretation or assistive listening systems. The interface needs to convey reliability, professionalism, and ease of use.
