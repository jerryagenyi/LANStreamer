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
  });
});
