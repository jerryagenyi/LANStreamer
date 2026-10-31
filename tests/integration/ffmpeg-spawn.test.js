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

  it('Low-latency flags present on BOTH input paths (capture-side before -i, flush_packets output-side)', () => {
    const streamingPath = path.join(__dirname, '../../src/services/StreamingService.js');
    const content = fs.readFileSync(streamingPath, 'utf8');
    // Device capture: input flags precede dshow -i (probing/buffering costs ~0.5-1s+ startup
    // and steady-state muxer batching up to ~1.3s at 192k without flush_packets)
    expect(content).toMatch(/'-fflags',\s*'nobuffer'/);
    expect(content).toMatch(/'-flags',\s*'low_delay'/);
    expect(content).toMatch(/'-probesize',\s*'32k'/);
    expect(content).toMatch(/'-analyzeduration',\s*'0'/);
    expect(content).toMatch(/'-flush_packets',\s*'1'/);
    // File-input path also flushes per packet
    const fileBlock = content.match(/inputFile\)[\s\S]{0,900}?icecastUrl/);
    expect(fileBlock).toBeDefined();
    expect(fileBlock[0]).toContain("'-flush_packets', '1'");
    // Device-input path carries the capture flags BEFORE the dshow input
    // (input flags configure the demuxer; output-side placement is a no-op)
    const dshowIdx = content.indexOf("'-f', 'dshow'");
    const nobufIdx = content.indexOf("'-fflags', 'nobuffer'");
    expect(dshowIdx).toBeGreaterThan(0);
    expect(nobufIdx).toBeGreaterThan(-1);
    expect(nobufIdx).toBeLessThan(dshowIdx);
  });
});
