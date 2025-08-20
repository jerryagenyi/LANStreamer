import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now()
    }
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('auth_token')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
          
        case 403:
          // Forbidden
          console.error('Access forbidden:', data.error?.message)
          break
          
        case 404:
          // Not found
          console.error('Resource not found:', error.config.url)
          break
          
        case 429:
          // Rate limited
          console.error('Rate limit exceeded')
          break
          
        case 500:
          // Server error
          console.error('Server error:', data.error?.message)
          break
          
        default:
          console.error('API error:', data.error?.message || error.message)
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message)
    } else {
      // Other error
      console.error('Request error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API methods
const apiService = {
  // Set auth token
  setAuthToken(token) {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  },
  
  // Clear auth token
  clearAuthToken() {
    delete api.defaults.headers.common['Authorization']
  },
  
  // Generic HTTP methods
  get(url, config = {}) {
    return api.get(url, config)
  },
  
  post(url, data = {}, config = {}) {
    return api.post(url, data, config)
  },
  
  put(url, data = {}, config = {}) {
    return api.put(url, data, config)
  },
  
  patch(url, data = {}, config = {}) {
    return api.patch(url, data, config)
  },
  
  delete(url, config = {}) {
    return api.delete(url, config)
  },
  
  // Authentication endpoints
  auth: {
    login(credentials) {
      return api.post('/auth/admin/login', credentials)
    },
    
    logout() {
      return api.post('/auth/logout')
    },
    
    verify() {
      return api.get('/auth/verify')
    },
    
    refresh() {
      return api.post('/auth/refresh')
    },
    
    me() {
      return api.get('/auth/me')
    },
    
    status() {
      return api.get('/auth/status')
    },
    
    changePassword(data) {
      return api.post('/auth/admin/change-password', data)
    }
  },
  
  // Stream endpoints
  streams: {
    getAll() {
      return api.get('/streams')
    },
    
    getById(id) {
      return api.get(`/streams/${id}`)
    },
    
    create(streamData) {
      return api.post('/streams', streamData)
    },
    
    update(id, streamData) {
      return api.put(`/streams/${id}`, streamData)
    },
    
    delete(id) {
      return api.delete(`/streams/${id}`)
    },
    
    start(id) {
      return api.post(`/streams/${id}/start`)
    },
    
    stop(id) {
      return api.post(`/streams/${id}/stop`)
    },
    
    restart(id) {
      return api.post(`/streams/${id}/restart`)
    },
    
    bulk(action, streamIds = []) {
      return api.post('/streams/bulk', { action, streamIds })
    }
  },
  
  // System endpoints
  system: {
    getInfo() {
      return api.get('/system/info')
    },
    
    getStatus() {
      return api.get('/system/status')
    },
    
    getMetrics() {
      return api.get('/system/metrics')
    },
    
    getLogs(params = {}) {
      return api.get('/system/logs', { params })
    },
    
    getNetwork() {
      return api.get('/system/network')
    },
    
    getAudioDevices() {
      return api.get('/system/audio-devices')
    },
    
    testAudioDevice(deviceId) {
      return api.post(`/system/audio-devices/${deviceId}/test`)
    },
    
    getIcecast() {
      return api.get('/system/icecast')
    },
    
    startIcecast() {
      return api.post('/system/icecast/start')
    },
    
    stopIcecast() {
      return api.post('/system/icecast/stop')
    },
    
    restartIcecast() {
      return api.post('/system/icecast/restart')
    },
    
    getFFmpeg() {
      return api.get('/system/ffmpeg')
    },
    
    testFFmpeg() {
      return api.post('/system/ffmpeg/test')
    },
    
    generateQR(url) {
      return api.get('/system/qr-code', { params: { url } })
    },
    
    restart() {
      return api.post('/system/restart')
    }
  },
  
  // Setup endpoints
  setup: {
    getStatus() {
      return api.get('/setup/status')
    },
    
    start(adminPassword) {
      return api.post('/setup/start', { password: adminPassword })
    },
    
    validateSystem() {
      return api.post('/setup/validate-system')
    },
    
    checkDependencies() {
      return api.post('/setup/check-dependencies')
    },
    
    configureIcecast(config) {
      return api.post('/setup/configure-icecast', config)
    },
    
    configureFFmpeg(config) {
      return api.post('/setup/configure-ffmpeg', config)
    },
    
    detectAudioDevices() {
      return api.post('/setup/detect-audio-devices')
    },
    
    configureAudioDevice(config) {
      return api.post('/setup/configure-audio-device', config)
    },
    
    testAudio(deviceId, channel) {
      return api.post('/setup/test-audio', { deviceId, channel })
    },
    
    configureNetwork(config) {
      return api.post('/setup/configure-network', config)
    },
    
    complete() {
      return api.post('/setup/complete')
    },
    
    reset() {
      return api.post('/setup/reset')
    }
  },
  
  // General endpoints
  health() {
    return api.get('/health')
  },
  
  info() {
    return api.get('/info')
  },
  
  stats() {
    return api.get('/stats')
  },
  
  config() {
    return api.get('/config')
  }
}

export default apiService
