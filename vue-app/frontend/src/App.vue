<template>
  <div id="app" :class="{ 'offline': !isOnline }">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <LoadingSpinner size="large" />
        <p class="mt-3">Loading LANStreamer...</p>
      </div>
    </div>

    <!-- Main layout -->
    <div v-else class="app-container">
      <!-- Navigation (hidden for certain routes) -->
      <Navigation v-if="!hideNavigation" />
      
      <!-- Main content -->
      <main :class="mainContentClass">
        <router-view />
      </main>
      
      <!-- Footer (hidden for client layout) -->
      <Footer v-if="!isClientLayout" />
    </div>

    <!-- Offline indicator -->
    <div v-if="!isOnline" class="offline-indicator">
      <i class="fas fa-wifi-slash"></i>
      <span>You are currently offline</span>
    </div>

    <!-- Notification container -->
    <NotificationContainer />

    <!-- Global modals -->
    <ConfirmModal ref="confirmModal" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import Navigation from './components/layout/Navigation.vue'
import Footer from './components/layout/Footer.vue'
import NotificationContainer from './components/common/NotificationContainer.vue'

export default {
  name: 'App',
  
  components: {
    Navigation,
    Footer,
    NotificationContainer
  },
  
  computed: {
    ...mapGetters(['isLoading', 'isOnline']),
    
    hideNavigation() {
      return this.$route.meta.hideNavigation || false
    },
    
    isClientLayout() {
      return this.$route.meta.layout === 'client'
    },
    
    mainContentClass() {
      const classes = ['main-content']
      
      if (this.hideNavigation) {
        classes.push('full-width')
      }
      
      if (this.isClientLayout) {
        classes.push('client-layout')
      }
      
      return classes.join(' ')
    }
  },
  
  methods: {
    ...mapActions(['initializeApp', 'handleError']),
    
    async initialize() {
      try {
        await this.initializeApp()
      } catch (error) {
        console.error('App initialization failed:', error)
        this.handleError(error)
      }
    }
  },
  
  async created() {
    await this.initialize()
  },
  
  mounted() {
    // Set up global keyboard shortcuts
    document.addEventListener('keydown', this.handleGlobalKeydown)
    
    // Set up visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  },
  
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleGlobalKeydown)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  },
  
  methods: {
    handleGlobalKeydown(event) {
      // Ctrl/Cmd + K for search (if implemented)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        // Implement global search if needed
      }
      
      // Escape key to close modals
      if (event.key === 'Escape') {
        // Close any open modals
        this.$refs.confirmModal?.close()
      }
    },
    
    handleVisibilityChange() {
      if (document.hidden) {
        // Page is hidden - pause real-time updates
        this.$store.dispatch('websocket/pauseUpdates')
      } else {
        // Page is visible - resume real-time updates
        this.$store.dispatch('websocket/resumeUpdates')
      }
    }
  }
}
</script>

<style lang="scss">
// Global styles
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  
  &.offline {
    filter: grayscale(0.3);
  }
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 20px;
  margin-left: 250px; // Navigation width
  transition: margin-left 0.3s ease;
  
  &.full-width {
    margin-left: 0;
  }
  
  &.client-layout {
    margin-left: 0;
    padding: 0;
  }
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 15px;
  }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  
  .loading-content {
    text-align: center;
    
    p {
      color: #6c757d;
      margin: 0;
    }
  }
}

.offline-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #dc3545;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  
  i {
    font-size: 16px;
  }
  
  span {
    font-size: 14px;
    font-weight: 500;
  }
}

// Utility classes
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

// Custom scrollbar
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  
  &:hover {
    background: #a8a8a8;
  }
}

// Bootstrap overrides
.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.card {
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.form-control {
  border-radius: 6px;
  border: 1px solid #dee2e6;
  
  &:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
}

// Status indicators
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-running {
    background: #d4edda;
    color: #155724;
  }
  
  &.status-stopped {
    background: #f8d7da;
    color: #721c24;
  }
  
  &.status-warning {
    background: #fff3cd;
    color: #856404;
  }
  
  &.status-error {
    background: #f8d7da;
    color: #721c24;
  }
  
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
}
</style>
