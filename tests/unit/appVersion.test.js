/**
 * The app version must come from package.json, not from npm's environment —
 * a packaged Electron build is not launched through npm.
 */
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('appVersion', () => {
  it('returns the package.json version with no npm environment present', async () => {
    const saved = process.env.npm_package_version;
    delete process.env.npm_package_version;
    try {
      const { appVersion } = await import('../../src/utils/appVersion.js');
      expect(appVersion()).toBe(pkg.version);
    } finally {
      if (saved !== undefined) process.env.npm_package_version = saved;
    }
  });
});
