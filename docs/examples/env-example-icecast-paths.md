# Icecast Path Configuration Example

This file shows how to configure the Icecast file paths in your `.env` file for manual path specification.

## Quick Setup

Copy these lines to your `.env` file and update the paths to match your Icecast installation:

```bash
# ===================================
# ICECAST FILE PATHS (Manual Configuration)
# ===================================

# Path to Icecast executable (e.g., "C:\Program Files (x86)\Icecast\bin\icecast.exe")
# Leave empty for automatic detection
ICECAST_EXE_PATH="C:\Program Files (x86)\Icecast\bin\icecast.exe"

# Path to Icecast configuration file (e.g., "C:\Program Files (x86)\Icecast\icecast.xml")
# Leave empty for automatic detection
ICECAST_CONFIG_PATH="C:\Program Files (x86)\Icecast\icecast.xml"

# Path to Icecast access log (e.g., "C:\Program Files (x86)\Icecast\log\access.log")
# Leave empty for automatic detection
ICECAST_ACCESS_LOG="C:\Program Files (x86)\Icecast\log\access.log"

# Path to Icecast error log (e.g., "C:\Program Files (x86)\Icecast\log\error.log")
# Leave empty for automatic detection
ICECAST_ERROR_LOG="C:\Program Files (x86)\Icecast\log\error.log"
```

## How It Works

1. **Manual Path Priority**: If you set these paths, LANStreamer will use them directly without searching
2. **Automatic Fallback**: If paths are empty or invalid, the system will automatically search for Icecast
3. **Path Validation**: LANStreamer will verify that all specified files exist and are accessible

## Benefits

- **Reliable**: No more guessing where Icecast is installed
- **Flexible**: Works with non-standard installations
- **Fast**: Skips automatic search when paths are known
- **Debugging**: Easier to troubleshoot path-related issues

## Example for Your System

Based on your installation at `C:\Program Files (x86)\Icecast`, your `.env` should look like:

```bash
ICECAST_EXE_PATH="C:\Program Files (x86)\Icecast\bin\icecast.exe"
ICECAST_CONFIG_PATH="C:\Program Files (x86)\Icecast\icecast.xml"
ICECAST_ACCESS_LOG="C:\Program Files (x86)\Icecast\log\access.log"
ICECAST_ERROR_LOG="C:\Program Files (x86)\Icecast\log\error.log"
```

## Troubleshooting

- **Paths with spaces**: Always use quotes around paths containing spaces
- **File permissions**: Ensure LANStreamer has read access to these files
- **Path format**: Use Windows-style paths with backslashes or forward slashes
- **File existence**: Verify that all specified files actually exist

## Related Documentation

- [Icecast Installation Guide](./icecast-installation.md)
- [Environment Configuration Example](../env-example.md)
- [LANStreamer Technical Specification](../LANStreamer-Technical-Specification.md)
