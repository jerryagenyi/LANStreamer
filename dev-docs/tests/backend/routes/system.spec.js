import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import app from '../../../src/server';
import AudioDeviceService from '../../../src/services/AudioDeviceService';

// Mock the AudioDeviceService
const mockDevices = [
  { id: 'mock-1', name: 'Mock Microphone' },
  { id: 'mock-2', name: 'Mock Line In' },
];
vi.spyOn(AudioDeviceService.prototype, 'getAudioDevices').mockReturnValue(mockDevices);

describe('GET /api/system/audio-devices', () => {
  it('should respond with a 200 status and a list of audio devices', async () => {
    const response = await request(app).get('/api/system/audio-devices');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toEqual(mockDevices);
  });
});
