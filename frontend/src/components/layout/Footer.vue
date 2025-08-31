<template>
  <footer class="main-footer">
    <div class="footer-content">
      <div class="footer-section">
        <h6>LANStreamer</h6>
        <p class="text-muted">Professional audio streaming solution for local networks</p>
      </div>
      
      <div class="footer-section">
        <h6>Quick Links</h6>
        <ul class="footer-links">
          <li><router-link to="/dashboard">Dashboard</router-link></li>
          <li><router-link to="/streams">Streams</router-link></li>
          <li><router-link to="/system">System</router-link></li>
        </ul>
      </div>
      
      <div class="footer-section">
        <h6>Support</h6>
        <ul class="footer-links">
          <li><a href="/docs" target="_blank">Documentation</a></li>
          <li><a href="/manual-setup" target="_blank">Manual Setup</a></li>
          <li><a href="#" @click.prevent="showSystemInfo">System Info</a></li>
        </ul>
      </div>
      
      <div class="footer-section">
        <h6>Status</h6>
        <div class="status-indicators">
          <div class="status-item">
            <span class="status-dot" :class="{ 'online': isOnline }"></span>
            <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
          </div>
          <div class="status-item">
            <span class="status-dot" :class="{ 'running': hasActiveStreams }"></span>
            <span>{{ hasActiveStreams ? 'Streaming' : 'Idle' }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="footer-info">
        <span>&copy; {{ currentYear }} LANStreamer. All rights reserved.</span>
        <span class="version">v{{ appVersion }}</span>
      </div>
    </div>
  </footer>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'Footer',
  
  computed: {
    ...mapGetters(['isOnline', 'appVersion']),
    
    currentYear() {
      return new Date().getFullYear()
    },
    
    hasActiveStreams() {
      // This would come from the audio store
      return false // Placeholder
    }
  },
  
  methods: {
    showSystemInfo() {
      // Show system information modal
      this.$store.dispatch('notifications/showInfo', 'System information feature coming soon')
    }
  }
}
</script>

<style lang="scss" scoped>
.main-footer {
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  margin-top: auto;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.footer-section {
  h6 {
    color: #2c3e50;
    font-weight: 600;
    margin-bottom: 1rem;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  p {
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }
}

.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  
  li {
    margin-bottom: 0.5rem;
    
    a {
      color: #6c757d;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s ease;
      
      &:hover {
        color: #007bff;
      }
    }
  }
}

.status-indicators {
  .status-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0.5rem;
    font-size: 14px;
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6c757d;
      
      &.online {
        background: #28a745;
      }
      
      &.running {
        background: #007bff;
      }
    }
  }
}

.footer-bottom {
  background: #e9ecef;
  padding: 1rem 2rem;
  border-top: 1px solid #dee2e6;
}

.footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  font-size: 14px;
  color: #6c757d;
  
  .version {
    font-weight: 500;
    color: #495057;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  .footer-bottom {
    padding: 1rem 1.5rem;
  }
  
  .footer-info {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
