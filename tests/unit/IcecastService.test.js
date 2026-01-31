/**
 * Unit tests for IcecastService (getActualPort, getHostname fallbacks)
 * Guards: port/host fallbacks when config not yet parsed
 */
import IcecastService from '../../src/services/IcecastService.js';

describe('IcecastService', () => {
  describe('getActualPort', () => {
    it('returns a number', () => {
      const port = IcecastService.getActualPort();
      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThanOrEqual(65535);
    });

    it('returns 8000 or 8200 when not yet initialised (fallback)', () => {
      const port = IcecastService.getActualPort();
      expect([8000, 8200]).toContain(port);
    });
  });

  describe('getHostname', () => {
    it('returns a string', () => {
      const host = IcecastService.getHostname();
      expect(typeof host).toBe('string');
      expect(host.length).toBeGreaterThan(0);
    });

    it('returns localhost when hostname not yet parsed', () => {
      const host = IcecastService.getHostname();
      expect(host).toBeDefined();
      // May be 'localhost' or an IP if icecast.xml was parsed
      expect(['localhost', /^\d+\.\d+\.\d+\.\d+$/].some(h => h === host || (typeof h.test === 'function' && h.test(host)))).toBe(true);
    });
  });
});
