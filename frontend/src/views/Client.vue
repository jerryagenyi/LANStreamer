<template>
  <div class="client-view">
    <div class="client-header">
      <h1>LANStreamer Audio Streams</h1>
      <p class="text-muted">Listen to available audio streams on your network</p>
    </div>
    
    <div class="streams-container">
      <div v-if="isLoading" class="loading-state">
        <LoadingSpinner size="large" />
        <p>Loading available streams...</p>
      </div>
      
      <div v-else-if="availableStreams.length === 0" class="no-streams">
        <i class="fas fa-info-circle text-info fa-3x mb-3"></i>
        <h3>No Active Streams</h3>
        <p>There are currently no audio streams available for listening.</p>
        <button @click="refreshStreams" class="btn btn-outline-primary">
          <i class="fas fa-sync-alt me-2"></i>
          Refresh
        </button>
      </div>
      
      <div v-else class="streams-grid">
        <div 
          v-for="stream in availableStreams" 
          :key="stream.id"
          class="stream-card"
        >
          <div class="stream-header">
            <div class="stream-icon">
              <i class="fas fa-broadcast-tower"></i>
            </div>
            <div class="stream-info">
              <h3 class="stream-name">{{ stream.name }}</h3>
              <p class="stream-description">{{ stream.description || 'Audio stream' }}</p>
            </div>
            <div class="stream-status">
              <span class="status-badge status-live">
                <i class="fas fa-circle"></i>
                Live
              </span>
            </div>
          </div>
          
          <div class="stream-controls">
            <button 
              @click="togglePlayback(stream)"
              :class="[
                'btn',
                stream.isPlaying ? 'btn-danger' : 'btn-success',
                'btn-lg',
                'w-100'
              ]"
              :disabled="isLoading"
            >
              <i :class="stream.isPlaying ? 'fas fa-stop' : 'fas fa-play'"></i>
              <span>{{ stream.isPlaying ? 'Stop' : 'Play' }}</span>
            </button>
          </div>
          
          <div v-if="stream.isPlaying" class="stream-progress">
            <div class="progress-info">
              <span>Now Playing</span>
              <span>{{ formatDuration(stream.duration) }}</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: stream.progress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="client-footer">
      <p class="text-muted">
        <i class="fas fa-info-circle me-2"></i>
        Connect to this page from any device on your local network to listen to audio streams
      </p>
    </div>
  </div>
</template>

<script>
import LoadingSpinner from '../components/common/LoadingSpinner.vue'

export default {
  name: 'Client',
  
  components: {
    LoadingSpinner
  },
  
  data() {
    return {
      isLoading: false,
      availableStreams: [
        {
          id: 'french',
          name: 'French Interpretation',
          description: 'Live French language interpretation',
          isPlaying: false,
          duration: 0,
          progress: 0
        },
        {
          id: 'spanish',
          name: 'Spanish Interpretation',
          description: 'Live Spanish language interpretation',
          isPlaying: false,
          duration: 0,
          progress: 0
        },
        {
          id: 'main',
          name: 'Main Stage Audio',
          description: 'Primary event audio feed',
          isPlaying: false,
          duration: 0,
          progress: 0
        }
      ]
    }
  },
  
  methods: {
    async refreshStreams() {
      this.isLoading = true
      try {
        // Simulate API call to refresh streams
        await new Promise(resolve => setTimeout(resolve, 1000))
        // In real implementation, this would fetch from the backend
      } catch (error) {
        console.error('Failed to refresh streams:', error)
      } finally {
        this.isLoading = false
      }
    },
    
    togglePlayback(stream) {
      if (stream.isPlaying) {
        this.stopStream(stream)
      } else {
        this.playStream(stream)
      }
    },
    
    playStream(stream) {
      stream.isPlaying = true
      stream.duration = 0
      stream.progress = 0
      
      // Simulate progress updates
      this.startProgressSimulation(stream)
      
      // In real implementation, this would start audio playback
      console.log(`Starting playback for stream: ${stream.name}`)
    },
    
    stopStream(stream) {
      stream.isPlaying = false
      stream.progress = 0
      
      // In real implementation, this would stop audio playback
      console.log(`Stopping playback for stream: ${stream.name}`)
    },
    
    startProgressSimulation(stream) {
      const interval = setInterval(() => {
        if (!stream.isPlaying) {
          clearInterval(interval)
          return
        }
        
        stream.duration += 1
        stream.progress = Math.min((stream.duration / 300) * 100, 100) // 5 minutes max
        
        if (stream.progress >= 100) {
          this.stopStream(stream)
          clearInterval(interval)
        }
      }, 1000)
    },
    
    formatDuration(seconds) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  },
  
  async created() {
    // Load available streams when component is created
    await this.refreshStreams()
  }
}
</script>

<style lang="scss" scoped>
.client-view {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 2rem;
}

.client-header {
  text-align: center;
  margin-bottom: 3rem;
  
  h1 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
  }
  
  p {
    font-size: 1.1rem;
  }
}

.streams-container {
  max-width: 800px;
  margin: 0 auto;
}

.loading-state,
.no-streams {
  text-align: center;
  padding: 3rem;
  
  h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
  }
  
  p {
    color: #6c757d;
    margin-bottom: 1.5rem;
  }
}

.streams-grid {
  display: grid;
  gap: 1.5rem;
}

.stream-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.stream-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stream-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  i {
    color: white;
    font-size: 1.25rem;
  }
}

.stream-info {
  flex: 1;
  min-width: 0;
  
  .stream-name {
    margin: 0 0 0.25rem 0;
    color: #2c3e50;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .stream-description {
    margin: 0;
    color: #6c757d;
    font-size: 0.9rem;
  }
}

.stream-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  
  &.status-live {
    background: #d4edda;
    color: #155724;
    
    i {
      color: #28a745;
      animation: pulse 2s infinite;
    }
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.stream-controls {
  margin-bottom: 1rem;
}

.stream-progress {
  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #6c757d;
  }
  
  .progress-bar {
    width: 100%;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }
  }
}

.client-footer {
  text-align: center;
  margin-top: 3rem;
  padding: 2rem;
  border-top: 1px solid #dee2e6;
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .client-view {
    padding: 1rem;
  }
  
  .client-header h1 {
    font-size: 2rem;
  }
  
  .stream-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .stream-status {
    align-self: center;
  }
}
</style>
