<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>LANStreamer Dashboard</h1>
      <p class="text-muted">Manage your audio streams and monitor system status</p>
    </div>

    <div class="dashboard-content">
      <!-- Audio Devices Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">
            <i class="fas fa-microphone me-2"></i>
            Available Audio Devices
          </h5>
        </div>
        <div class="card-body">
          <div v-if="isLoadingDevices" class="text-center py-4">
            <LoadingSpinner size="medium" />
            <p class="mt-2 text-muted">Loading audio devices...</p>
          </div>
          
          <div v-else-if="audioDevices.length === 0" class="text-center py-4">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
            <p class="text-muted">No audio devices detected</p>
            <button @click="refreshDevices" class="btn btn-outline-primary btn-sm">
              <i class="fas fa-sync-alt me-1"></i>
              Refresh
            </button>
          </div>
          
          <div v-else class="audio-devices-list">
            <div 
              v-for="device in audioDevices" 
              :key="device.id"
              class="audio-device-item"
            >
              <div class="device-info">
                <i class="fas fa-microphone text-primary me-2"></i>
                <div class="device-details">
                  <h6 class="device-name">{{ device.name }}</h6>
                  <small class="text-muted">ID: {{ device.id }}</small>
                </div>
              </div>
              <div class="device-actions">
                                 <button 
                   @click="handleStartStream(device)"
                   class="btn btn-success btn-sm"
                   :disabled="isStartingStream"
                 >
                  <i class="fas fa-play me-1"></i>
                  Start Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Streams Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">
            <i class="fas fa-broadcast-tower me-2"></i>
            Active Streams
          </h5>
        </div>
        <div class="card-body">
          <div v-if="activeStreams.length === 0" class="text-center py-4">
            <i class="fas fa-info-circle text-info fa-2x mb-3"></i>
            <p class="text-muted">No active streams</p>
            <p class="text-muted small">Start a stream from an audio device above</p>
          </div>
          
          <div v-else class="streams-list">
            <div 
              v-for="stream in activeStreams" 
              :key="stream.id"
              class="stream-item"
            >
              <div class="stream-info">
                <div class="stream-status">
                  <span class="status-indicator status-running">
                    <span class="status-dot"></span>
                    Live
                  </span>
                </div>
                <div class="stream-details">
                  <h6 class="stream-name">{{ stream.name || `Stream ${stream.id}` }}</h6>
                  <small class="text-muted">Device: {{ stream.deviceId }}</small>
                </div>
              </div>
              <div class="stream-actions">
                                 <button 
                   @click="handleStopStream(stream.id)"
                   class="btn btn-danger btn-sm"
                   :disabled="isStoppingStream"
                 >
                  <i class="fas fa-stop me-1"></i>
                  Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">
            <i class="fas fa-bolt me-2"></i>
            Quick Actions
          </h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3">
                             <button 
                 @click="handleStartAllStreams"
                 class="btn btn-primary w-100"
                 :disabled="!canStartAllStreams || isStartingStream"
               >
                <i class="fas fa-play-circle me-2"></i>
                Start All Streams
              </button>
            </div>
            <div class="col-md-6 mb-3">
                             <button 
                 @click="handleStopAllStreams"
                 class="btn btn-warning w-100"
                 :disabled="activeStreams.length === 0 || isStoppingStream"
               >
                <i class="fas fa-stop-circle me-2"></i>
                Stop All Streams
              </button>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <button 
                @click="refreshDevices"
                class="btn btn-outline-secondary w-100"
                :disabled="isLoadingDevices"
              >
                <i class="fas fa-sync-alt me-2"></i>
                Refresh Devices
              </button>
            </div>
            <div class="col-md-6 mb-3">
              <a 
                href="/client"
                target="_blank"
                class="btn btn-outline-info w-100"
              >
                <i class="fas fa-headphones me-2"></i>
                Listener Page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'

export default {
  name: 'Dashboard',
  
  components: {
    LoadingSpinner
  },
  
  data() {
    return {
      isLoadingDevices: false,
      isStartingStream: false,
      isStoppingStream: false
    }
  },
  
  computed: {
    ...mapGetters([
      'audioDevices',
      'activeStreams'
    ]),
    
    canStartAllStreams() {
      return this.audioDevices.length > 0 && this.activeStreams.length === 0
    }
  },
  
  methods: {
    ...mapActions([
      'fetchAudioDevices',
      'startStream',
      'stopStream',
      'startAllStreams',
      'stopAllStreams'
    ]),
    
    async refreshDevices() {
      this.isLoadingDevices = true
      try {
        await this.fetchAudioDevices()
      } catch (error) {
        console.error('Failed to refresh devices:', error)
        this.$store.dispatch('notifications/showError', 'Failed to refresh audio devices')
      } finally {
        this.isLoadingDevices = false
      }
    },
    
    async handleStartStream(device) {
      this.isStartingStream = true
      try {
        await this.startStream({
          deviceId: device.id,
          name: device.name
        })
        this.$store.dispatch('notifications/showSuccess', `Stream started for ${device.name}`)
      } catch (error) {
        console.error('Failed to start stream:', error)
        this.$store.dispatch('notifications/showError', 'Failed to start stream')
      } finally {
        this.isStartingStream = false
      }
    },
    
    async handleStopStream(streamId) {
      this.isStoppingStream = true
      try {
        await this.stopStream(streamId)
        this.$store.dispatch('notifications/showSuccess', 'Stream stopped successfully')
      } catch (error) {
        console.error('Failed to stop stream:', error)
        this.$store.dispatch('notifications/showError', 'Failed to stop stream')
      } finally {
        this.isStoppingStream = false
      }
    },
    
    async handleStartAllStreams() {
      this.isStartingStream = true
      try {
        await this.startAllStreams()
        this.$store.dispatch('notifications/showSuccess', 'All streams started successfully')
      } catch (error) {
        console.error('Failed to start all streams:', error)
        this.$store.dispatch('notifications/showError', 'Failed to start all streams')
      } finally {
        this.isStartingStream = false
      }
    },
    
    async handleStopAllStreams() {
      this.isStoppingStream = true
      try {
        await this.stopAllStreams()
        this.$store.dispatch('notifications/showSuccess', 'All streams stopped successfully')
      } catch (error) {
        console.error('Failed to stop all streams:', error)
        this.$store.dispatch('notifications/showError', 'Failed to stop all streams')
      } finally {
        this.isStoppingStream = false
      }
    }
  },
  
  async created() {
    // Load audio devices when component is created
    await this.refreshDevices()
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 2rem;
  
  h1 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
}

.audio-devices-list,
.streams-list {
  .audio-device-item,
  .stream-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 1rem;
    background: #fff;
    transition: all 0.2s ease;
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-color: #007bff;
    }
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

.device-info,
.stream-info {
  display: flex;
  align-items: center;
  flex: 1;
  
  .device-details,
  .stream-details {
    margin-left: 1rem;
    
    .device-name,
    .stream-name {
      margin: 0;
      color: #2c3e50;
    }
    
    small {
      font-size: 0.875rem;
    }
  }
}

.stream-status {
  margin-right: 1rem;
}

.device-actions,
.stream-actions {
  display: flex;
  gap: 0.5rem;
}

.quick-actions {
  .btn {
    margin-bottom: 0.5rem;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .audio-device-item,
  .stream-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    
    .device-actions,
    .stream-actions {
      justify-content: center;
    }
  }
  
  .quick-actions .row {
    margin: 0;
    
    .col-md-6 {
      padding: 0 0.25rem;
    }
  }
}
</style>
