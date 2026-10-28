/**
 * Unit tests for errorDiagnostics
 * Guards: connection-refused diagnosis, Windows exit code 4294967291 (-5)
 */
import errorDiagnostics from '../../src/utils/errorDiagnostics.js';

describe('errorDiagnostics', () => {
  describe('diagnose', () => {
    it('returns connection category for Windows unsigned exit code 4294967291 (-5)', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { icecastPort: 8200 });
      expect(result).toBeDefined();
      expect(result.category).toBe('connection');
      expect(result.severity).toBe('critical');
      expect(result.title).toMatch(/icecast|connect/i);
      expect(result.solutions).toBeDefined();
      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.solutions.some(s => String(s).includes('8200'))).toBe(true);
    });

    it('returns connection category for Windows unsigned 4294967291 with port 8000', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { icecastPort: 8000 });
      expect(result).toBeDefined();
      expect(result.category).toBe('connection');
      expect(result.solutions.some(s => String(s).includes('8000'))).toBe(true);
    });

    it('returns connection category when stderr contains "connection refused"', () => {
      const result = errorDiagnostics.diagnose('Connection refused', 1, { icecastPort: 8200 });
      expect(result).toBeDefined();
      expect(result.category).toBe('connection');
    });

    it('returns connection category when stderr contains ECONNREFUSED', () => {
      const result = errorDiagnostics.diagnose('ECONNREFUSED', 1, {});
      expect(result).toBeDefined();
      expect(result.category).toBe('connection');
    });

    it('uses context.port fallback when icecastPort not provided (4294967291)', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { port: 9000 });
      expect(result).toBeDefined();
      expect(result.solutions.some(s => String(s).includes('9000'))).toBe(true);
    });

    it('returns generic diagnosis for unknown exit code when no pattern matches', () => {
      const result = errorDiagnostics.diagnose('', 99, {});
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.solutions).toBeDefined();
    });

    it('handles empty stderr with 4294967291 (connection refused)', () => {
      const result = errorDiagnostics.diagnose('', 4294967291, { icecastPort: 8200 });
      expect(result).toBeDefined();
      expect(result.category).toBe('connection');
    });

    it('returns device_not_found when stderr contains "could not find audio device" and context has deviceId', () => {
      const stderr = 'Could not find audio device with name [OBS Virtual Camera (Audio)]';
      const result = errorDiagnostics.diagnose(stderr, 1, { deviceId: 'OBS Virtual Camera (Audio)', deviceName: 'OBS Virtual Camera (Audio)' });
      expect(result).toBeDefined();
      expect(result.category).toBe('device_not_found');
      expect(result.title).toBeDefined();
      expect(result.solutions).toBeDefined();
      expect(result.solutions.length).toBeGreaterThan(0);
    });

    // Regression: FFmpeg 9 device-open failures can exit with -5; the exit-code
    // shortcut used to misclassify them as Icecast connection errors.
    it('classifies FFmpeg 9 [in#0/dshow] open failure with exit -5 as a device error, not connection', () => {
      const stderr = '[in#0/dshow @ 0000] Error opening input: Immediate exit requested\n[dshow @ 0000] Could not find device "OBS Virtual Camera (Audio)"';
      const result = errorDiagnostics.diagnose(stderr, -5, { deviceId: 'OBS Virtual Camera (Audio)', deviceName: 'OBS Virtual Camera (Audio)', icecastPort: 8200 });
      expect(result.category).not.toBe('connection');
      expect(['device_not_found', 'device_busy', 'directshow']).toContain(result.category);
      expect(result.title).toMatch(/device|audio source/i);
    });

    it('classifies "Error opening input" (no dshow tag) as device_not_found', () => {
      const stderr = 'in#0/dshow: Error opening input: Immediate exit requested';
      const result = errorDiagnostics.diagnose(stderr, 1, { deviceId: 'Mic', deviceName: 'Mic' });
      expect(result.category).toBe('device_not_found');
    });

    it('still classifies genuine connection refusals with exit -5 as connection', () => {
      const stderr = '[icecast @ 0000] Connection refused';
      const result = errorDiagnostics.diagnose(stderr, -5, { deviceId: 'Mic', icecastPort: 8200 });
      expect(result.category).toBe('connection');
    });
  });
});
