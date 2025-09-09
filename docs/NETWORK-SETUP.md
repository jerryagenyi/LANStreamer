# 🌐 Network Setup for Live Events

## ⚠️ **Critical Issue: Changing IP Addresses**

If your computer's IP address changes during a live event, **all listeners will lose connection** and need the new URL. This is unacceptable for professional streaming.

## 🎯 **Solutions (Choose One)**

### **Option 1: Static IP Address** ⭐ *Recommended for Events*

**Windows 10/11:**
1. Press `Win + R`, type `ncpa.cpl`, press Enter
2. Right-click your network adapter → Properties
3. Double-click "Internet Protocol Version 4 (TCP/IPv4)"
4. Select "Use the following IP address"
5. Enter:
   - **IP Address**: `192.168.1.100` (or similar - check your router)
   - **Subnet Mask**: `255.255.255.0`
   - **Default Gateway**: `192.168.1.1` (your router's IP)
   - **DNS**: `8.8.8.8` and `8.8.4.4`

**How to find your router's IP range:**
```cmd
ipconfig /all
```
Look for "Default Gateway" - usually `192.168.1.1` or `192.168.0.1`

### **Option 2: DHCP Reservation** ⭐ *Best Long-term*

**Router Configuration:**
1. Find your computer's MAC address:
   ```cmd
   ipconfig /all
   ```
   Look for "Physical Address"

2. Access router admin panel:
   - Open browser: `http://192.168.1.1` (or your gateway IP)
   - Login with admin credentials

3. Find DHCP settings (varies by router):
   - Look for "DHCP Reservation" or "Static DHCP"
   - Add your MAC address → assign specific IP
   - Save settings and restart router

### **Option 3: Computer Name Access** ⚠️ *Limited Compatibility*

**Find Computer Name:**
1. Press `Win + Pause` or go to Settings → System → About
2. Note your "Device name"

**Share URL as:**
```
http://YOUR-COMPUTER-NAME:3001/streams
```

**Limitations:**
- Only works if listeners' devices can resolve the computer name
- May not work on all networks
- Not reliable for public events

## 🔧 **Event Day Checklist**

### **Before the Event:**
- [ ] Set static IP or DHCP reservation
- [ ] Test LANStreamer access from multiple devices
- [ ] Print/share the final URL with listeners
- [ ] Test with actual streaming devices

### **During the Event:**
- [ ] Monitor network connection
- [ ] Have backup plan if network fails
- [ ] Keep router/network equipment stable

### **Backup Plans:**
1. **Mobile Hotspot**: Use phone as backup internet
2. **Secondary Network**: Have WiFi backup ready
3. **Local Network**: Can work without internet for local streaming

## 📱 **Sharing URLs with Listeners**

### **For Static IP Setup:**
```
Primary: http://192.168.1.100:3001/streams
Backup:  http://YOUR-COMPUTER-NAME:3001/streams
```

### **QR Code Generation:**
Use any QR code generator with your LANStreamer URL for easy mobile access.

## 🚨 **Troubleshooting**

### **"Page Won't Load" Issues:**
1. Check Windows Firewall (allow port 3001)
2. Verify LANStreamer server is running
3. Test locally first: `http://localhost:3001`

### **IP Address Keeps Changing:**
- Router is reassigning DHCP leases
- Use DHCP reservation (Option 2 above)
- Check for network adapter power management settings

### **Listeners Can't Connect:**
1. Verify they're on same network
2. Check firewall settings
3. Test with computer name instead of IP
4. Ensure LANStreamer server is running

## 💡 **Pro Tips**

- **Test everything** before the event with real devices
- **Document the final URL** and share it clearly
- **Have a backup plan** ready
- **Monitor network stability** during events
- **Consider a dedicated streaming computer** for important events

## 🔮 **Future Features**

### **mDNS Support (Planned)**
- **Stable hostnames**: Future versions will support `http://lanstreamer.local:3001/streams`
- **Automatic discovery**: Listeners will be able to find LANStreamer without knowing IP addresses
- **No configuration needed**: Works automatically on supported networks
- **Status**: Currently in development for future releases

---

*For technical support, check the main README.md or create an issue on GitHub.*
