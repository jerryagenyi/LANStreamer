# VB Audio Virtual Cable Setup Guide for LANStreamer

## 🎯 **What We're Building**

A simple audio streaming setup where:
- **Windows Media Player** → **VB Cable Input** → **LANStreamer** → **Network Stream**
- **Monitor on PC** (Edge browser for dashboard, Chrome for listening)
- **Listen on Mobile Phone** (connected to same network)

---

## 📋 **Prerequisites**

✅ **VB Audio Virtual Cable** installed (free version)  
✅ **LANStreamer** running  
✅ **Icecast** running  
✅ **Ear Trumpet** installed (for easy audio routing)  

---

## 🔧 **Step-by-Step Setup**

### **Step 1: Configure Windows Media Player**
1. **Open Windows Media Player**
2. **Right-click** on the volume icon in Media Player
3. **Select "CABLE Input (VB-Audio Virtual Cable)"** as output device
4. **Play any music file** to test

### **Step 2: Configure Your PC Audio Monitoring**
1. **Open Ear Trumpet** (or Windows Sound Settings)
2. **Set these audio outputs:**
   - **Edge Browser** (LANStreamer Dashboard) → **PC Speakers/Headphones**
   - **Chrome Browser** (Stream Listening) → **PC Speakers/Headphones**
   - **Windows Media Player** → **CABLE Input (VB-Audio Virtual Cable)**

### **Step 3: Create Stream in LANStreamer**
1. **Open Edge** → Go to LANStreamer Dashboard
2. **Click "Manage Streams"**
3. **Click "Add New Stream"**
4. **Configure:**
   - **Stream Name:** `Music Stream - VB Cable`
   - **Audio Source:** Select `CABLE Output (VB-Audio Virtual Cable)`
   - **Bitrate:** `192 kbps` (recommended)
5. **Click "Start Stream"**

### **Step 4: Monitor on PC**
1. **Open Chrome** (separate from Edge dashboard)
2. **Go to:** `http://localhost:3000/streams`
3. **Click Play** on your music stream
4. **Set Chrome audio output** to your PC speakers
5. **You should hear the music** playing through Chrome

### **Step 5: Listen on Mobile Phone**
1. **Connect phone to same WiFi network**
2. **Find your PC's IP address:**
   - Press `Win + R` → Type `cmd` → Press Enter
   - Type `ipconfig` → Find your IP (e.g., `192.168.1.100`)
3. **Open phone browser** → Go to `http://YOUR-PC-IP:3000/streams`
4. **Click Play** on the music stream
5. **Music should play** through phone speakers

---

## 🎵 **Audio Flow Diagram**

```
Windows Media Player
        ↓
CABLE Input (VB-Audio Virtual Cable)
        ↓
CABLE Output (VB-Audio Virtual Cable) ← LANStreamer captures this
        ↓
LANStreamer → Icecast Server
        ↓
Network Stream (http://IP:8000/stream-id)
        ↓
┌─────────────────┬─────────────────┐
│   PC Chrome     │   Mobile Phone  │
│   (localhost)   │   (network IP)  │
└─────────────────┴─────────────────┘
```

---

## 🔍 **Troubleshooting**

### **No Audio in Stream**
- ✅ Check Media Player is set to **CABLE Input**
- ✅ Check LANStreamer selected **CABLE Output**
- ✅ Verify music is actually playing in Media Player
- ✅ Check VB Cable is working: Control Panel → Sound → Recording → CABLE Output should show green bars

### **Can't Hear on PC**
- ✅ Chrome audio output set to PC speakers (not Cable)
- ✅ Chrome volume not muted
- ✅ PC speakers/headphones working

### **Can't Access from Mobile**
- ✅ Phone on same WiFi network
- ✅ PC firewall allows LANStreamer (port 3000)
- ✅ Use correct IP address (not localhost)
- ✅ Try: `http://IP:3000/streams` (not just `IP:3000`)

### **Stream Shows Error**
- ✅ Restart LANStreamer server
- ✅ Refresh device list in LANStreamer
- ✅ Check Icecast is running
- ✅ Try different browser (Chrome recommended)

---

## 💡 **Pro Tips**

1. **Use Ear Trumpet** for easy per-app audio routing
2. **Keep Edge for dashboard**, Chrome for listening (avoids conflicts)
3. **Test locally first** before trying mobile
4. **192 kbps bitrate** gives good quality without too much bandwidth
5. **Bookmark the stream URL** on your phone for easy access

---

## 🎯 **Quick Test Checklist**

- [ ] Media Player playing music → CABLE Input
- [ ] LANStreamer stream created with CABLE Output
- [ ] Stream shows "Running" status in dashboard
- [ ] Chrome can play stream at `localhost:3000/streams`
- [ ] Mobile can access `http://PC-IP:3000/streams`
- [ ] Audio quality sounds good on both devices

---

## 📱 **Mobile Access URLs**

Replace `192.168.1.100` with your actual PC IP:

- **Stream Page:** `http://192.168.1.100:3000/streams`
- **Dashboard:** `http://192.168.1.100:3000`
- **Direct Stream:** `http://192.168.1.100:8000/your-stream-id`

---

*This guide assumes you're using the free VB Audio Virtual Cable with one input/output pair. For multiple streams, you'd need the paid version with additional cables.*
