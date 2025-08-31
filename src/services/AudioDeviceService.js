class AudioDeviceService {
  /**
   * Retrieves a list of available audio input devices.
   * In this initial version, it returns a mocked list.
   * @returns {Array<{id: string, name: string}>} A list of audio devices.
   */
  getAudioDevices() {
    // In the future, this will be replaced with a real implementation
    // that queries the operating system for audio devices.
    return [
      { id: 'device-1', name: 'Microphone (Realtek Audio)' },
      { id: 'device-2', name: 'Line In (Behringer UMC404HD 192k)' },
      { id: 'device-3', name: 'CABLE Output (VB-Audio Virtual Cable)' },
    ];
  }
}

export default new AudioDeviceService();