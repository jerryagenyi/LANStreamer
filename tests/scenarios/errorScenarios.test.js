/**
 * Scenario-based error diagnostics tests
 *
 * These tests use REAL stderr samples from actual FFmpeg/Icecast failures
 * to ensure the error diagnostics system correctly identifies and reports issues.
 *
 * Run with: npm test errorScenarios
 */
import errorDiagnostics from '../../src/utils/errorDiagnostics.js';

describe('Error Scenarios (real stderr samples)', () => {
  describe('Scenario: Icecast not running (connection refused)', () => {
    const realStderr = `
[info] Starting audio stream...
[info] Using input device: Microphone (Realtek Audio)
[info] FFmpeg version 5.1.2
[info] Configuration: --enable-gpl --enable-version3
[info]  Output: icecast://source:****@localhost:8000/stream1
[error] Connection refused
[error] socket error: 10061
`;

    it('diagnoses as connection error with port 8000', () => {
      const result = errorDiagnostics.diagnose(realStderr, 4294967291, { icecastPort: 8000 });
      expect(result.category).toBe('connection');
      expect(result.title).toMatch(/icecast|connect/i);
      expect(result.solutions.some(s => s.includes('8000'))).toBe(true);
    });

    it('provides actionable solutions', () => {
      const result = errorDiagnostics.diagnose(realStderr, 4294967291, { icecastPort: 8000 });
      expect(result.solutions.length).toBeGreaterThan(0);
      // Should mention checking if Icecast is running
      expect(result.solutions.some(s => /running/i.test(s) && /icecast/i.test(s))).toBe(true);
    });
  });

  describe('Scenario: Port conflict (Docker using port 8000)', () => {
    const realStderr = `
[info] Starting Icecast...
[error] bind failed: Address already in use
[error] EADDRINUSE: :::8000
[error] Another process is using port 8000
`;

    it('diagnoses as port_conflict', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, { port: 8000 });
      expect(result.category).toBe('port_conflict');
      expect(result.title).toMatch(/port|in use/i);
    });

    it('mentions Docker as a common cause', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, { port: 8000 });
      expect(result.causes.some(c => /docker/i.test(c))).toBe(true);
    });
  });

  describe('Scenario: Wrong Icecast source password', () => {
    const realStderr = `
[info] Connecting to Icecast...
[info] URL: icecast://source:password@localhost:8000/stream
[error] 401 Unauthorized
[error] Authentication failed
[error] Source client not accepted
`;

    it('diagnoses as authentication error', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.category).toBe('authentication');
      expect(result.title).toMatch(/auth|password/i);
    });

    it('mentions icecast.xml password configuration', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.solutions.some(s => /icecast\.xml/i.test(s) && /password/i.test(s))).toBe(true);
    });
  });

  describe('Scenario: Mount point limit reached (2 streams max)', () => {
    const realStderr = `
[info] Starting stream 3...
[error] 403 Forbidden
[error] Mount point /stream3 already in use
[error] Source limit reached
`;

    it('diagnoses as mount_point error', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.category).toBe('mount_point');
      expect(result.title).toMatch(/limit|mount/i);
    });

    it('mentions the default 2-stream limit', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.causes.some(c => /2.*concurrent|default.*2/i.test(c))).toBe(true);
    });
  });

  describe('Scenario: Audio device not found (disconnected)', () => {
    const realStderr = `
[info] Input: audio=Microphone (HD Pro Webcam C910)
[error] Error opening input: could not find audio device
[error] Device with name [Microphone (HD Pro Webcam C910)] not found
[info] Immediate exit requested
`;

    it('diagnoses as device_not_found when deviceId in context', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {
        deviceId: 'microphone-hd-pro-webcam-c910',
        deviceName: 'Microphone (HD Pro Webcam C910)'
      });
      expect(result.category).toBe('device_not_found');
      expect(result.title).toMatch(/device|not found/i);
    });

    it('includes the device name in the error message', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {
        deviceId: 'microphone-hd-pro-webcam-c910',
        deviceName: 'Microphone (HD Pro Webcam C910)'
      });
      expect(result.description).toContain('Microphone (HD Pro Webcam C910)');
    });
  });

  describe('Scenario: Device busy (another app using microphone)', () => {
    const realStderr = `
[info] Attempting to open: audio=Microphone (Realtek Audio)
[error] Cannot open audio device
[error] Device or resource busy
[error] Exclusive access denied
`;

    it('diagnoses as device_busy', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {
        deviceName: 'Microphone (Realtek Audio)'
      });
      expect(result.category).toBe('device_busy');
      expect(result.title).toMatch(/busy|in use/i);
    });

    it('mentions common apps that lock the microphone', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {
        deviceName: 'Microphone (Realtek Audio)'
      });
      const commonApps = ['zoom', 'teams', 'discord', 'skype'];
      const hasAppMention = commonApps.some(app =>
        result.solutions.some(s => s.toLowerCase().includes(app))
      );
      expect(hasAppMention).toBe(true);
    });
  });

  describe('Scenario: VB-Audio Virtual Cable not working', () => {
    const realStderr = `
[info] Input: audio=CABLE Output (VB-Audio Virtual Cable)
[error] Error opening input: could not find audio device
[error] VB-Audio Virtual Cable error
`;

    it('diagnoses as virtual_audio when vb-audio pattern detected', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {
        deviceId: 'vb-audio-virtual-cable',
        deviceName: 'CABLE Output (VB-Audio Virtual Cable)'
      });
      expect(result.category).toBe('virtual_audio');
      expect(result.title).toMatch(/vb-audio|virtual cable/i);
    });
  });

  describe('Scenario: DirectShow error (Windows audio subsystem)', () => {
    const realStderr = `
[info] Using dshow input format
[error] Error opening dshow: Could not enumerate audio devices
[error] DirectShow error: 0x80070000
`;

    it('diagnoses as directshow error', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.category).toBe('directshow');
      expect(result.title).toMatch(/windows|directshow/i);
    });
  });

  describe('Scenario: Codec not found (minimal FFmpeg build)', () => {
    const realStderr = `
[info] Output codec: libmp3lame
[error] Encoder libmp3lame not found
[error] Unknown encoder 'libmp3lame'
`;

    it('diagnoses as codec error', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.category).toBe('codec');
      expect(result.title).toMatch(/codec|not available/i);
    });

    it('mentions MP3/libmp3lame specifically', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, {});
      expect(result.description).toContain('MP3');
      expect(result.solutions.some(s => /libmp3lame/i.test(s))).toBe(true);
    });
  });

  describe('Scenario: Connection timeout (Icecast not responding)', () => {
    const realStderr = `
[info] Connecting to Icecast at localhost:8000...
[error] Connection timed out
[error] Operation timeout after 10000ms
`;

    it('diagnoses as timeout error', () => {
      const result = errorDiagnostics.diagnose(realStderr, 1, { icecastPort: 8000 });
      expect(result.category).toBe('timeout');
      expect(result.title).toMatch(/timeout/i);
    });
  });

  describe('Scenario: Empty stderr with Windows exit code 4294967291', () => {
    it('diagnoses as connection error (exit code implies connection refused)', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { icecastPort: 8200 });
      expect(result.category).toBe('connection');
      expect(result.severity).toBe('critical');
    });

    it('includes the port in solutions', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { icecastPort: 8200 });
      expect(result.solutions.some(s => s.includes('8200'))).toBe(true);
    });
  });

  describe('Scenario: Unknown/generic error (no pattern match)', () => {
    const weirdStderr = `
[info] Some FFmpeg output
[error] Something strange happened
[error] Exit code: 999
`;

    it('returns a diagnosis anyway (no crash)', () => {
      const result = errorDiagnostics.diagnose(weirdStderr, 999, {});
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.solutions).toBeDefined();
      expect(result.solutions.length).toBeGreaterThan(0);
    });

    it('provides generic troubleshooting steps', () => {
      const result = errorDiagnostics.diagnose(weirdStderr, 999, {});
      expect(result.category).toBe('unknown');
      // Should suggest checking Icecast status
      expect(result.solutions.some(s => /icecast|running/i.test(s))).toBe(true);
      // Should suggest checking logs
      expect(result.solutions.some(s => /log|troubleshoot/i.test(s))).toBe(true);
    });
  });

  /**
   * ADD YOUR SCENARIOS HERE
   * When you encounter a new error, add the stderr and expected diagnosis below.
   */
  describe('Scenario: [Your error here]', () => {
    // TODO: Add stderr from actual failure
    const yourRealStderr = `
[PASTE YOUR STDERR HERE]
`;

    it('diagnoses correctly', () => {
      const result = errorDiagnostics.diagnose(yourRealStderr, 1, {});
      // Update this assertion based on what you expect
      // expect(result.category).toBe('expected_category');
    });
  });
});
