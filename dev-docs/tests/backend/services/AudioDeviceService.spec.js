import { describe, it, expect } from 'vitest';
import AudioDeviceService from '../../../src/services/AudioDeviceService';

describe('AudioDeviceService', () => {
  it('should return a mocked list of audio devices', () => {
    const audioService = new AudioDeviceService();
    const devices = audioService.getAudioDevices();

    // Expect the result to be an array
    expect(Array.isArray(devices)).toBe(true);
    // Expect at least one device to be in the array for the mock
    expect(devices.length).toBeGreaterThan(0);

    // Check the structure of the first device object
    const firstDevice = devices[0];
    expect(firstDevice).toHaveProperty('id');
    expect(firstDevice).toHaveProperty('name');
    expect(typeof firstDevice.id).toBe('string');
    expect(typeof firstDevice.name).toBe('string');
  });
});
