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
    expect(content).toMatch(/spawn\s*\(\s*ffmpegPath\s*,\s*args\s*,/);
    const spawnBlock = content.match(/spawn\s*\([^)]+\)/s);
    expect(spawnBlock).toBeDefined();
    expect(spawnBlock[0]).toMatch(/shell:\s*true/);
  });
});
