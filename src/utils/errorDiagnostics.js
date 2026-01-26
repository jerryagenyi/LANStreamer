/**
 * LANStreamer Error Diagnostics System
 * 
 * Centralized error handling that detects error types from FFmpeg/Icecast output
 * and provides user-friendly, actionable error messages with troubleshooting steps.
 * 
 * Error Categories:
 * - Connection errors (Icecast unreachable, port conflicts)
 * - Authentication errors (wrong passwords)
 * - Device errors (audio device not found, in use, driver issues)
 * - Codec errors (missing codecs, encoding failures)
 * - Resource errors (memory, CPU, disk)
 * - Configuration errors (invalid settings)
 */

import logger from './logger.js';

/**
 * Error diagnostic result structure
 * @typedef {Object} DiagnosticResult
 * @property {string} category - Error category (connection, auth, device, codec, resource, config)
 * @property {string} title - Short error title
 * @property {string} description - Detailed error description
 * @property {string[]} causes - Possible causes
 * @property {string[]} solutions - Suggested solutions
 * @property {string} technicalDetails - Technical details for advanced users
 * @property {string} severity - Error severity (critical, warning, info)
 */

class ErrorDiagnostics {
  constructor() {
    // Windows-specific exit codes
    this.windowsExitCodes = {
      // Signed/unsigned equivalents
      '4294967291': { signed: -5, name: 'ACCESS_DENIED_OR_CONNECTION_REFUSED' },
      '2812791304': { signed: -1482175992, hex: '0xA7F00008', name: 'WINDOWS_PROCESS_CRASH' },
      '4294967295': { signed: -1, name: 'GENERAL_ERROR' },
      '4294967294': { signed: -2, name: 'MISUSE_OF_COMMAND' },
      '1': { signed: 1, name: 'GENERAL_FFmpeg_ERROR' },
      '255': { signed: 255, name: 'FFmpeg_INTERNAL_ERROR' },
    };

    // Error pattern matchers (order matters - more specific patterns first)
    this.errorPatterns = [
      // Connection/Network Errors
      {
        category: 'connection',
        patterns: [
          /connection refused/i,
          /error number -138/i,
          /could not connect/i,
          /connection failed/i,
          /ECONNREFUSED/i,
          /network is unreachable/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseConnectionError(stderr, exitCode, context)
      },
      
      // Port Conflict Errors
      {
        category: 'port_conflict',
        patterns: [
          /address already in use/i,
          /EADDRINUSE/i,
          /bind failed/i,
          /port.*in use/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnosePortConflict(stderr, exitCode, context)
      },

      // Authentication Errors
      {
        category: 'authentication',
        patterns: [
          /401 unauthorized/i,
          /authentication failed/i,
          /invalid password/i,
          /access denied/i,
          /permission denied/i,
          /wrong password/i,
          /source client not accepted/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseAuthError(stderr, exitCode, context)
      },

      // Mount Point Errors
      {
        category: 'mount_point',
        patterns: [
          /mount point.*already in use/i,
          /mountpoint.*busy/i,
          /stream already exists/i,
          /source limit reached/i,
          /too many sources/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseMountPointError(stderr, exitCode, context)
      },

      // Audio Device Errors
      {
        category: 'device_not_found',
        patterns: [
          /could not find audio device/i,
          /no such device/i,
          /device not found/i,
          /cannot find.*device/i,
          /immediate exit requested/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseDeviceNotFound(stderr, exitCode, context)
      },

      // Device In Use Errors
      {
        category: 'device_busy',
        patterns: [
          /device or resource busy/i,
          /device is being used/i,
          /exclusive access/i,
          /cannot open.*device/i,
          /access to.*denied/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseDeviceBusy(stderr, exitCode, context)
      },

      // Virtual Audio Device Errors
      {
        category: 'virtual_audio',
        patterns: [
          /vb-audio/i,
          /virtual cable/i,
          /voicemeeter/i,
          /cable output/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseVirtualAudioError(stderr, exitCode, context)
      },

      // DirectShow Errors (Windows)
      {
        category: 'directshow',
        patterns: [
          /dshow/i,
          /directshow/i,
          /could not set video options/i,
          /could not enumerate.*devices/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseDirectShowError(stderr, exitCode, context)
      },

      // Codec Errors
      {
        category: 'codec',
        patterns: [
          /unknown encoder/i,
          /encoder.*not found/i,
          /codec not found/i,
          /no codec could be found/i,
          /libmp3lame/i,
          /libvorbis/i,
          /aac encoder/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseCodecError(stderr, exitCode, context)
      },

      // Format Errors
      {
        category: 'format',
        patterns: [
          /unknown format/i,
          /invalid format/i,
          /unsupported format/i,
          /format not supported/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseFormatError(stderr, exitCode, context)
      },

      // Memory/Resource Errors
      {
        category: 'resource',
        patterns: [
          /out of memory/i,
          /cannot allocate/i,
          /memory allocation failed/i,
          /insufficient.*memory/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseResourceError(stderr, exitCode, context)
      },

      // Timeout Errors
      {
        category: 'timeout',
        patterns: [
          /timed out/i,
          /timeout/i,
          /operation.*timeout/i,
        ],
        diagnose: (stderr, exitCode, context) => this.diagnoseTimeoutError(stderr, exitCode, context)
      },
    ];
  }

  /**
   * Main diagnostic entry point - analyzes error and returns user-friendly diagnosis
   * @param {string} stderr - FFmpeg/Icecast stderr output
   * @param {number|string} exitCode - Process exit code
   * @param {Object} context - Additional context (deviceId, streamId, etc.)
   * @returns {DiagnosticResult} Diagnosis with causes and solutions
   */
  diagnose(stderr, exitCode, context = {}) {
    const stderrLower = (stderr || '').toLowerCase();
    const exitCodeStr = String(exitCode);

    logger.info('Error diagnostics starting', { 
      exitCode, 
      stderrLength: stderr?.length || 0,
      context 
    });

    // Check for specific exit codes first (Windows crash codes)
    if (this.windowsExitCodes[exitCodeStr]) {
      const codeInfo = this.windowsExitCodes[exitCodeStr];
      
      // Exit code -5 or 4294967291 typically means connection refused
      if (codeInfo.signed === -5) {
        return this.diagnoseConnectionError(stderr, exitCode, context);
      }
      
      // Windows process crash code
      if (codeInfo.hex === '0xA7F00008') {
        return this.diagnoseWindowsCrash(stderr, exitCode, context);
      }
    }

    // Try pattern matching
    for (const errorType of this.errorPatterns) {
      for (const pattern of errorType.patterns) {
        if (pattern.test(stderrLower)) {
          logger.info(`Error matched category: ${errorType.category}`);
          return errorType.diagnose(stderr, exitCode, context);
        }
      }
    }

    // If no specific pattern matched, provide generic diagnosis based on exit code
    return this.diagnoseGenericError(stderr, exitCode, context);
  }

  /**
   * Diagnose connection errors (Icecast unreachable)
   */
  diagnoseConnectionError(stderr, exitCode, context) {
    const port = context.icecastPort || context.port || 8000;

    return {
      category: 'connection',
      severity: 'critical',
      title: '🔌 Cannot Connect to Icecast Server',
      description: `FFmpeg cannot establish a connection to the Icecast server on port ${port}.`,
      causes: [
        'Icecast server is not running',
        `Port ${port} is blocked or in use by another application (e.g., Docker, another server)`,
        'Firewall is blocking the connection',
        'Icecast crashed or failed to start properly',
        'Wrong Icecast host or port configured',
      ],
      solutions: [
        '1. Check if Icecast is running: Look for "Server Online" in the dashboard',
        `2. Check for port conflicts: Open PowerShell and run: netstat -ano | findstr ":${port}"`,
        `3. If another app is using port ${port} (like Docker), either:`,
        '   • Stop that application, OR',
        `   • Change Icecast port to a different port in icecast.xml and .env file`,
        '4. Restart Icecast from the dashboard (Stop → Start)',
        `5. Check Windows Firewall settings for port ${port}`,
      ],
      technicalDetails: `Exit code: ${exitCode}\nTarget: icecast://source:***@localhost:${port}/\nError: Connection refused or timeout`,
    };
  }

  /**
   * Diagnose port conflict errors
   */
  diagnosePortConflict(stderr, exitCode, context) {
    const port = context.port || context.icecastPort || 8000;

    return {
      category: 'port_conflict',
      severity: 'critical',
      title: '🚫 Port Already In Use',
      description: `Port ${port} is already being used by another application.`,
      causes: [
        `Docker Desktop is running and using port ${port}`,
        'Another Icecast instance is already running',
        'A different streaming server is using the port',
        'A previous Icecast process didn\'t shut down properly',
      ],
      solutions: [
        `1. Find what\'s using the port: netstat -ano | findstr ":${port}"`,
        '2. Common conflicts:',
        `   • Docker Desktop often uses port ${port} - close Docker or change Icecast port`,
        '   • Previous Icecast instance - kill it with: taskkill /IM icecast.exe /F',
        '3. To change Icecast port:',
        '   • Edit icecast.xml: change <port>8000</port> to <port>8080</port>',
        '   • Create .env file with: ICECAST_PORT=8080',
        '4. Restart LANStreamer and Icecast after changes',
      ],
      technicalDetails: `Port: ${port}\nError: EADDRINUSE - Address already in use`,
    };
  }

  /**
   * Diagnose authentication errors
   */
  diagnoseAuthError(stderr, exitCode, context) {
    return {
      category: 'authentication',
      severity: 'critical',
      title: '🔐 Authentication Failed',
      description: 'FFmpeg was rejected by Icecast due to incorrect credentials.',
      causes: [
        'Source password in LANStreamer doesn\'t match icecast.xml',
        'icecast.xml was edited but Icecast wasn\'t restarted',
        'Using wrong username (should be "source" for streaming)',
      ],
      solutions: [
        '1. Check icecast.xml for <source-password> value (default: hackme)',
        '2. Ensure .env file has matching ICECAST_SOURCE_PASSWORD',
        '3. Restart Icecast after any password changes',
        '4. If using custom password, update both icecast.xml AND .env file',
      ],
      technicalDetails: `Exit code: ${exitCode}\nExpected username: source\nCheck: icecast.xml <authentication> section`,
    };
  }

  /**
   * Diagnose mount point errors (stream limit reached)
   */
  diagnoseMountPointError(stderr, exitCode, context) {
    return {
      category: 'mount_point',
      severity: 'warning',
      title: '📻 Stream Limit Reached',
      description: 'Icecast has reached its maximum number of concurrent streams.',
      causes: [
        'Default Icecast config only allows 2 concurrent streams',
        'Previous streams didn\'t disconnect properly (zombie streams)',
        'Multiple stream start attempts created duplicate mounts',
      ],
      solutions: [
        '1. Stop existing streams from the dashboard before starting new ones',
        '2. Increase stream limit in icecast.xml:',
        '   • Find <sources>2</sources>',
        '   • Change to <sources>10</sources> (or desired number)',
        '3. Restart Icecast after editing the config',
        '4. If streams are stuck, restart Icecast to clear all mounts',
      ],
      technicalDetails: `Current limit: Check <limits><sources> in icecast.xml\nDefault: 2 sources`,
    };
  }

  /**
   * Diagnose device not found errors
   */
  diagnoseDeviceNotFound(stderr, exitCode, context) {
    const deviceId = context.deviceId || 'Unknown device';
    const deviceName = context.deviceName || deviceId;

    return {
      category: 'device_not_found',
      severity: 'critical',
      title: '🎤 Audio Device Not Found',
      description: `The audio device "${deviceName}" cannot be found by FFmpeg.`,
      causes: [
        'Device was disconnected or unplugged',
        'Device driver crashed or was updated',
        'Virtual audio device (VB-Audio) needs to be restarted',
        'Device name changed after a Windows update',
        'Device is disabled in Windows Sound settings',
      ],
      solutions: [
        '1. Click "Refresh Devices" in the dashboard to update the device list',
        '2. Check Windows Sound settings (right-click speaker icon → Sounds)',
        '3. Verify the device appears in Recording devices tab',
        '4. For virtual audio devices (VB-Audio):',
        '   • Restart VB-Audio Virtual Cable or VoiceMeeter',
        '   • Or reboot your computer',
        '5. Try selecting a different audio device',
      ],
      technicalDetails: `Device ID: ${deviceId}\nDevice Name: ${deviceName}\nPlatform: Windows DirectShow`,
    };
  }

  /**
   * Diagnose device busy/in use errors
   */
  diagnoseDeviceBusy(stderr, exitCode, context) {
    const deviceName = context.deviceName || context.deviceId || 'Audio device';

    return {
      category: 'device_busy',
      severity: 'warning',
      title: '🔒 Audio Device In Use',
      description: `The audio device "${deviceName}" is being used by another application.`,
      causes: [
        'Another application has exclusive access (Zoom, Teams, Discord, etc.)',
        'Windows Sound Recorder or Voice Recorder is open',
        'Another streaming software is using the device',
        'A previous FFmpeg process is still running',
      ],
      solutions: [
        '1. Close other applications that might use the microphone:',
        '   • Video conferencing: Zoom, Teams, Discord, Skype',
        '   • Recording software: Audacity, OBS, Voice Recorder',
        '   • Browsers with active voice/video calls',
        '2. Check Task Manager for other FFmpeg processes and end them',
        '3. Try a different audio device',
        '4. Restart your computer to release all device locks',
      ],
      technicalDetails: `Device: ${deviceName}\nError: Device or resource busy / Exclusive access denied`,
    };
  }

  /**
   * Diagnose virtual audio device errors (VB-Audio, VoiceMeeter)
   */
  diagnoseVirtualAudioError(stderr, exitCode, context) {
    const deviceName = context.deviceName || 'Virtual Audio Device';
    const stderrLower = (stderr || '').toLowerCase();
    
    const isVBCable = stderrLower.includes('cable') || stderrLower.includes('vb-audio virtual');
    const isVoiceMeeter = stderrLower.includes('voicemeeter');

    const deviceType = isVBCable ? 'VB-Audio Virtual Cable' : 
                       isVoiceMeeter ? 'VoiceMeeter' : 'Virtual Audio Device';

    return {
      category: 'virtual_audio',
      severity: 'warning',
      title: `🔗 ${deviceType} Issue`,
      description: `The virtual audio device "${deviceName}" is not working properly.`,
      causes: [
        'Virtual audio driver crashed or needs restart',
        'VB-Audio/VoiceMeeter software is not running',
        'Driver conflict with Windows audio system',
        'Virtual device was recently installed and needs a reboot',
      ],
      solutions: [
        '1. Restart the virtual audio software:',
        isVBCable ? 
          '   • VB-Audio has no control panel - reinstall or reboot to restart' :
          '   • Open VoiceMeeter and ensure it\'s running properly',
        '2. Check Windows Sound settings → Recording devices',
        '3. Try using a physical microphone instead',
        '4. Reboot your computer to fully restart audio drivers',
        '5. Reinstall VB-Audio Virtual Cable from vb-audio.com',
      ],
      technicalDetails: `Device Type: ${deviceType}\nDevice Name: ${deviceName}\nNote: Virtual audio devices may require system restart`,
    };
  }

  /**
   * Diagnose DirectShow errors (Windows-specific)
   */
  diagnoseDirectShowError(stderr, exitCode, context) {
    return {
      category: 'directshow',
      severity: 'critical',
      title: '🖥️ Windows Audio System Error',
      description: 'FFmpeg cannot access the Windows DirectShow audio subsystem.',
      causes: [
        'Windows audio service crashed',
        'DirectShow filters are corrupted',
        'Audio driver incompatibility',
        'Windows Update changed audio components',
      ],
      solutions: [
        '1. Restart Windows Audio service:',
        '   • Open Services (services.msc)',
        '   • Find "Windows Audio" → Right-click → Restart',
        '2. Update audio drivers from Device Manager',
        '3. Run Windows Audio troubleshooter:',
        '   • Settings → System → Sound → Troubleshoot',
        '4. Reboot your computer',
        '5. If problem persists, try reinstalling FFmpeg',
      ],
      technicalDetails: `Subsystem: DirectShow (dshow)\nPlatform: Windows\nService: Windows Audio (Audiosrv)`,
    };
  }

  /**
   * Diagnose codec errors
   */
  diagnoseCodecError(stderr, exitCode, context) {
    const stderrLower = (stderr || '').toLowerCase();
    
    let missingCodec = 'Unknown codec';
    if (stderrLower.includes('libmp3lame')) missingCodec = 'MP3 (libmp3lame)';
    else if (stderrLower.includes('aac')) missingCodec = 'AAC';
    else if (stderrLower.includes('vorbis')) missingCodec = 'Vorbis/OGG';

    return {
      category: 'codec',
      severity: 'critical',
      title: '🎵 Audio Codec Not Available',
      description: `FFmpeg cannot find the required audio codec: ${missingCodec}`,
      causes: [
        'FFmpeg was installed without full codec support',
        'Using a minimal/lite FFmpeg build',
        'Codec library files are missing or corrupted',
      ],
      solutions: [
        '1. Download full FFmpeg build with all codecs:',
        '   • Go to: https://www.gyan.dev/ffmpeg/builds/',
        '   • Download: ffmpeg-release-full.7z',
        '   • Extract and replace your current FFmpeg installation',
        '2. Verify FFmpeg has codec support:',
        '   • Run: ffmpeg -encoders | findstr mp3',
        '   • Should show "libmp3lame" in the list',
        '3. Add FFmpeg to system PATH if not already',
      ],
      technicalDetails: `Missing codec: ${missingCodec}\nFFmpeg build: Check with "ffmpeg -version"`,
    };
  }

  /**
   * Diagnose format errors
   */
  diagnoseFormatError(stderr, exitCode, context) {
    return {
      category: 'format',
      severity: 'warning',
      title: '📁 Unsupported Format',
      description: 'The requested audio format is not supported.',
      causes: [
        'Invalid format specified in stream configuration',
        'FFmpeg build doesn\'t support the format',
        'Icecast mount point expects different format',
      ],
      solutions: [
        '1. LANStreamer supports: MP3, AAC, OGG (Vorbis)',
        '2. Try a different format when creating the stream',
        '3. Ensure FFmpeg supports the format: ffmpeg -formats',
        '4. Check Icecast mount point configuration',
      ],
      technicalDetails: `Supported formats: MP3 (libmp3lame), AAC, OGG (libvorbis)`,
    };
  }

  /**
   * Diagnose resource errors (memory, CPU)
   */
  diagnoseResourceError(stderr, exitCode, context) {
    return {
      category: 'resource',
      severity: 'critical',
      title: '💾 System Resource Error',
      description: 'Not enough system resources to start the stream.',
      causes: [
        'System is low on available memory (RAM)',
        'Too many streams running simultaneously',
        'Other applications consuming resources',
      ],
      solutions: [
        '1. Close unnecessary applications to free up memory',
        '2. Reduce the number of concurrent streams',
        '3. Lower stream quality/bitrate settings',
        '4. Check Task Manager for memory usage',
        '5. Restart your computer to clear memory',
      ],
      technicalDetails: `Error: Memory allocation failed\nCheck: Task Manager → Performance → Memory`,
    };
  }

  /**
   * Diagnose timeout errors
   */
  diagnoseTimeoutError(stderr, exitCode, context) {
    return {
      category: 'timeout',
      severity: 'warning',
      title: '⏱️ Connection Timeout',
      description: 'The connection to Icecast timed out before completing.',
      causes: [
        'Icecast server is overloaded',
        'Network latency is too high',
        'Firewall is blocking but not rejecting connections',
        'Icecast is starting up slowly',
      ],
      solutions: [
        '1. Wait a few seconds and try again',
        '2. Restart Icecast server',
        '3. Check if Icecast is responding: visit http://localhost:8000 in browser',
        '4. Reduce number of concurrent streams',
        '5. Check firewall settings',
      ],
      technicalDetails: `Error: Operation timed out\nDefault timeout: 10 seconds`,
    };
  }

  /**
   * Diagnose Windows-specific crash (exit code 0xA7F00008)
   */
  diagnoseWindowsCrash(stderr, exitCode, context) {
    return {
      category: 'windows_crash',
      severity: 'critical',
      title: '💥 FFmpeg Process Crashed',
      description: 'FFmpeg crashed immediately after starting (Windows process failure).',
      causes: [
        'Audio driver incompatibility with FFmpeg',
        'Corrupted FFmpeg installation',
        'Missing Windows Visual C++ runtime',
        'DirectShow subsystem failure',
        'Antivirus blocking FFmpeg',
      ],
      solutions: [
        '1. Try a different audio device to isolate the issue',
        '2. Reinstall FFmpeg from gyan.dev (full build)',
        '3. Install/repair Visual C++ Redistributable:',
        '   • Download from Microsoft\'s website',
        '   • Install both x86 and x64 versions',
        '4. Temporarily disable antivirus and try again',
        '5. Check Windows Event Viewer for crash details:',
        '   • Event Viewer → Windows Logs → Application',
        '6. Update audio drivers from Device Manager',
      ],
      technicalDetails: `Exit code: ${exitCode} (0xA7F00008)\nType: Windows process-level crash\nSubsystem: DirectShow / Audio driver`,
    };
  }

  /**
   * Generic error diagnosis when no specific pattern matches
   */
  diagnoseGenericError(stderr, exitCode, context) {
    // Try to extract any useful info from stderr
    const stderrLower = (stderr || '').toLowerCase();
    
    // Check if it's mostly just FFmpeg version info (no real error)
    const hasOnlyVersionInfo = stderr && 
      stderr.includes('ffmpeg version') && 
      !stderrLower.includes('error') &&
      !stderrLower.includes('failed') &&
      !stderrLower.includes('cannot') &&
      !stderrLower.includes('denied');

    if (hasOnlyVersionInfo) {
      return this.diagnoseConnectionError(stderr, exitCode, context);
    }

    return {
      category: 'unknown',
      severity: 'warning',
      title: '⚠️ Stream Failed to Start',
      description: 'The stream could not be started. See details below for troubleshooting.',
      causes: [
        'Icecast server may not be running or accessible',
        'Audio device may be unavailable',
        'Network or configuration issue',
      ],
      solutions: [
        '1. Verify Icecast is running (check dashboard status)',
        '2. Click "Refresh Devices" and try a different audio device',
        '3. Restart LANStreamer and Icecast',
        '4. Check the logs folder for detailed error information',
        '5. See TROUBLESHOOTING.md for common issues and fixes',
      ],
      technicalDetails: `Exit code: ${exitCode}\nStderr preview: ${(stderr || 'No output').substring(0, 500)}`,
    };
  }

  /**
   * Format diagnostic result into a user-friendly message
   * @param {DiagnosticResult} diagnosis - Diagnosis result
   * @returns {string} Formatted message
   */
  formatMessage(diagnosis) {
    const lines = [
      diagnosis.title,
      '',
      diagnosis.description,
      '',
      '📋 POSSIBLE CAUSES:',
      ...diagnosis.causes.map(c => `   • ${c}`),
      '',
      '✅ SOLUTIONS:',
      ...diagnosis.solutions.map(s => `   ${s}`),
    ];

    return lines.join('\n');
  }

  /**
   * Format diagnostic result for notification (shorter version)
   * @param {DiagnosticResult} diagnosis - Diagnosis result
   * @returns {string} Compact formatted message
   */
  formatNotification(diagnosis) {
    // Keep it concise for notification display
    const topCauses = diagnosis.causes.slice(0, 2);
    const topSolutions = diagnosis.solutions.slice(0, 3);

    const lines = [
      diagnosis.title,
      '',
      diagnosis.description,
      '',
      '🔧 Quick fixes:',
      ...topSolutions,
    ];

    return lines.join('\n');
  }
}

// Export singleton instance
export default new ErrorDiagnostics();
