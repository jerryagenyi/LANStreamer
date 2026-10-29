/**
 * Regression test: FFmpeg spawn options on Windows (shell: true)
 * Guards: Prevents PATH resolution regression on Windows (spawn must use shell: true)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('FFmpeg spawn options (Windows)', () => {
  it('StreamingService spawn call includes shell: true in options', () => {
    const streamingPath = path.join(__dirname, '../../src/services/StreamingService.js');
    const content = fs.readFileSync(streamingPath, 'utf8');
    expect(content).toMatch(/shell:\s*true/);
    // ffmpegPath (PATH) or spawnCommand (quoted absolute vendored path) — both valid
    expect(content).toMatch(/spawn\s*\(\s*(ffmpegPath|spawnCommand)\s*,\s*args\s*,/);
    const spawnBlock = content.match(/spawn\s*\(\s*(ffmpegPath|spawnCommand)\s*,\s*args\s*,\s*\{[^}]*shell:\s*true/s);
    expect(spawnBlock).toBeDefined();
  });
});
