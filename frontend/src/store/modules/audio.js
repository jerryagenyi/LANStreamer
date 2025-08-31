import api from '../../services/api'

const state = {
  audioDevices: [],
  activeStreams: {},
  isLoadingDevices: false,
  isLoadingStreams: false,
  error: null
}

const getters = {
  audioDevices: state => state.audioDevices,
  activeStreams: state => Object.values(state.activeStreams),
  isLoadingDevices: state => state.isLoadingDevices,
  isLoadingStreams: state => state.isLoadingStreams,
  error: state => state.error,
  
  // Get stream by ID
  getStreamById: (state) => (id) => state.activeStreams[id],
  
  // Check if a device is currently streaming
  isDeviceStreaming: (state) => (deviceId) => {
    return Object.values(state.activeStreams).some(stream => stream.deviceId === deviceId)
  },
  
  // Get stream count
  streamCount: state => Object.keys(state.activeStreams).length
}

const actions = {
  // Fetch audio devices from the backend
  async fetchAudioDevices({ commit }) {
    commit('SET_LOADING_DEVICES', true)
    commit('CLEAR_ERROR')
    
    try {
      const response = await api.get('/api/system/audio-devices')
      commit('SET_AUDIO_DEVICES', response.data)
    } catch (error) {
      console.error('Failed to fetch audio devices:', error)
      commit('SET_ERROR', 'Failed to load audio devices')
      throw error
    } finally {
      commit('SET_LOADING_DEVICES', false)
    }
  },
  
  // Start a new stream
  async startStream({ commit, dispatch }, streamConfig) {
    commit('SET_LOADING_STREAMS', true)
    commit('CLEAR_ERROR')
    
    try {
      const response = await api.post('/api/streams/start', streamConfig)
      
      // Add the new stream to active streams
      const stream = {
        id: response.data.streamId,
        name: streamConfig.name || `Stream ${response.data.streamId}`,
        deviceId: streamConfig.deviceId,
        status: 'running',
        config: streamConfig,
        startedAt: new Date().toISOString()
      }
      
      commit('ADD_STREAM', stream)
      
      // Start polling for stream status updates
      dispatch('startStreamStatusPolling', stream.id)
      
      return stream
    } catch (error) {
      console.error('Failed to start stream:', error)
      commit('SET_ERROR', 'Failed to start stream')
      throw error
    } finally {
      commit('SET_LOADING_STREAMS', false)
    }
  },
  
  // Stop a stream
  async stopStream({ commit, dispatch }, streamId) {
    commit('SET_LOADING_STREAMS', true)
    commit('CLEAR_ERROR')
    
    try {
      await api.post('/api/streams/stop', { id: streamId })
      
      // Remove the stream from active streams
      commit('REMOVE_STREAM', streamId)
      
      // Stop polling for this stream
      dispatch('stopStreamStatusPolling', streamId)
      
    } catch (error) {
      console.error('Failed to stop stream:', error)
      commit('SET_ERROR', 'Failed to stop stream')
      throw error
    } finally {
      commit('SET_LOADING_STREAMS', false)
    }
  },
  
  // Start all available streams
  async startAllStreams({ dispatch, getters }) {
    const devices = getters.audioDevices
    const streams = []
    
    for (const device of devices) {
      try {
        const stream = await dispatch('startStream', {
          deviceId: device.id,
          name: device.name
        })
        streams.push(stream)
      } catch (error) {
        console.error(`Failed to start stream for device ${device.id}:`, error)
        // Continue with other devices even if one fails
      }
    }
    
    return streams
  },
  
  // Stop all active streams
  async stopAllStreams({ dispatch, getters }) {
    const streamIds = getters.activeStreams.map(stream => stream.id)
    const results = []
    
    for (const streamId of streamIds) {
      try {
        await dispatch('stopStream', streamId)
        results.push({ id: streamId, success: true })
      } catch (error) {
        console.error(`Failed to stop stream ${streamId}:`, error)
        results.push({ id: streamId, success: false, error })
      }
    }
    
    return results
  },
  
  // Poll for stream status updates
  startStreamStatusPolling({ commit }, streamId) {
    // In a real implementation, this would use WebSockets
    // For now, we'll simulate status updates
    const interval = setInterval(() => {
      // Simulate status updates
      commit('UPDATE_STREAM_STATUS', {
        id: streamId,
        status: 'running',
        lastUpdate: new Date().toISOString()
      })
    }, 5000) // Update every 5 seconds
    
    // Store the interval ID for cleanup
    commit('SET_STREAM_POLLING_INTERVAL', { streamId, interval })
  },
  
  // Stop polling for a specific stream
  stopStreamStatusPolling({ commit }, streamId) {
    commit('CLEAR_STREAM_POLLING_INTERVAL', streamId)
  },
  
  // Clear all polling intervals
  clearAllPolling({ commit }) {
    commit('CLEAR_ALL_POLLING_INTERVALS')
  }
}

const mutations = {
  SET_AUDIO_DEVICES(state, devices) {
    state.audioDevices = devices
  },
  
  SET_LOADING_DEVICES(state, loading) {
    state.isLoadingDevices = loading
  },
  
  SET_LOADING_STREAMS(state, loading) {
    state.isLoadingStreams = loading
  },
  
  SET_ERROR(state, error) {
    state.error = error
  },
  
  CLEAR_ERROR(state) {
    state.error = null
  },
  
  ADD_STREAM(state, stream) {
    state.activeStreams = {
      ...state.activeStreams,
      [stream.id]: stream
    }
  },
  
  REMOVE_STREAM(state, streamId) {
    const { [streamId]: removed, ...remaining } = state.activeStreams
    state.activeStreams = remaining
  },
  
  UPDATE_STREAM_STATUS(state, { id, status, lastUpdate }) {
    if (state.activeStreams[id]) {
      state.activeStreams[id] = {
        ...state.activeStreams[id],
        status,
        lastUpdate
      }
    }
  },
  
  SET_STREAM_POLLING_INTERVAL(state, { streamId, interval }) {
    if (!state.pollingIntervals) {
      state.pollingIntervals = {}
    }
    state.pollingIntervals[streamId] = interval
  },
  
  CLEAR_STREAM_POLLING_INTERVAL(state, streamId) {
    if (state.pollingIntervals && state.pollingIntervals[streamId]) {
      clearInterval(state.pollingIntervals[streamId])
      const { [streamId]: removed, ...remaining } = state.pollingIntervals
      state.pollingIntervals = remaining
    }
  },
  
  CLEAR_ALL_POLLING_INTERVALS(state) {
    if (state.pollingIntervals) {
      Object.values(state.pollingIntervals).forEach(interval => {
        clearInterval(interval)
      })
      state.pollingIntervals = {}
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
