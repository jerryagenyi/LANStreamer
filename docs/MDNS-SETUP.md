# mDNS Setup for LANStreamer

## Overview

LANStreamer now includes mDNS (Multicast DNS) support to provide stable hostname access to your streaming server. This eliminates the need to manually update IP addresses when your router restarts or your network configuration changes.

## Features

- **Stable Hostname**: Access your server via `http://lanstreamer.local:3001/streams`
- **Network Discovery**: The server appears as "LANStreamer" in network discovery tools
- **Automatic Fallback**: If mDNS fails, the server falls back to IP-based access
- **Cross-Platform**: Works on Windows, macOS, and Linux

## How It Works

1. **Server Advertisement**: When LANStreamer starts, it advertises itself on the local network using mDNS
2. **Service Discovery**: Other devices on the network can discover the "LANStreamer" service
3. **Hostname Resolution**: The hostname `lanstreamer.local` resolves to the server's current IP address
4. **Stable Access**: Listeners can bookmark `http://lanstreamer.local:3001/streams` and it will always work

## Usage

### For Listeners

**Preferred Method (mDNS):**
```
http://lanstreamer.local:3001/streams
```

**Fallback Method (IP Address):**
```
http://[SERVER_IP]:3001/streams
```

### For Administrators

The server will display both URLs when it starts:
- Admin Dashboard: `http://[IP]:3001`
- Listener Page: `http://lanstreamer.local:3001/streams` (preferred)
- Listener Page: `http://[IP]:3001/streams` (fallback)

## Testing mDNS

### From Another Device

1. **Ping Test**: `ping lanstreamer.local`
2. **Browser Test**: Open `http://lanstreamer.local:3001/streams`
3. **Network Discovery**: Look for "LANStreamer" in your network discovery tools

### From the Server Device

1. **Check Console**: Look for mDNS success/failure messages
2. **Network Tools**: Use `nslookup lanstreamer.local` or similar tools

## Troubleshooting

### mDNS Not Working

If you see "mDNS advertisement failed" in the console:

1. **Check Network**: Ensure all devices are on the same local network
2. **Firewall**: Check if Windows Firewall is blocking mDNS traffic
3. **Router Settings**: Some routers may block mDNS traffic
4. **Use Fallback**: The server will still work with IP addresses

### Common Issues

- **Windows Firewall**: May block mDNS traffic on port 5353
- **Corporate Networks**: May have mDNS disabled
- **VPN**: VPN connections may interfere with local network discovery

## Technical Details

- **Protocol**: Uses mDNS (Multicast DNS) on port 5353
- **Service Type**: HTTP service advertisement
- **Package**: Uses `bonjour` npm package for cross-platform compatibility
- **Fallback**: Automatic fallback to IP-based access if mDNS fails

## Network Requirements

- All devices must be on the same local network (192.168.x.x, 10.x.x.x, or 172.16-31.x.x)
- mDNS traffic must not be blocked by firewalls or routers
- Devices must support mDNS (Windows 10+, macOS, iOS, Android, Linux)

## Security Notes

- mDNS only works on local networks
- No internet access required
- Service advertisement is local only
- No authentication required for service discovery (streaming still requires proper setup)
