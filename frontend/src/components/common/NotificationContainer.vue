<template>
  <div class="notification-container">
    <TransitionGroup 
      name="notification" 
      tag="div" 
      class="notifications-list"
    >
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'notification',
          `notification-${notification.type}`,
          { 'notification-persistent': notification.persistent }
        ]"
        @click="markAsRead(notification.id)"
      >
        <div class="notification-icon">
          <i :class="getIconClass(notification.type)"></i>
        </div>
        <div class="notification-content">
          <h6 class="notification-title">{{ notification.title }}</h6>
          <p class="notification-message">{{ notification.message }}</p>
        </div>
        <button 
          @click.stop="removeNotification(notification.id)"
          class="notification-close"
          :title="'Dismiss'"
        >
          <i class="fas fa-times"></i>
        </button>
        
        <!-- Auto-dismiss timer for non-persistent notifications -->
        <div 
          v-if="!notification.persistent"
          class="notification-timer"
          :style="{ animationDuration: '5s' }"
        ></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'NotificationContainer',
  
  computed: {
    ...mapGetters(['notifications'])
  },
  
  methods: {
    ...mapActions(['markNotificationRead', 'removeNotification']),
    
    getIconClass(type) {
      const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      }
      return icons[type] || icons.info
    },
    
    async markAsRead(id) {
      await this.markNotificationRead(id)
      
      // Auto-remove non-persistent notifications after marking as read
      const notification = this.notifications.find(n => n.id === id)
      if (notification && !notification.persistent) {
        setTimeout(() => {
          this.removeNotification(id)
        }, 1000)
      }
    }
  },
  
  watch: {
    notifications: {
      handler(newNotifications) {
        // Auto-remove non-persistent notifications after 5 seconds
        newNotifications.forEach(notification => {
          if (!notification.persistent && !notification.read) {
            setTimeout(() => {
              if (!notification.read) {
                this.removeNotification(notification.id)
              }
            }, 5000)
          }
        })
      },
      immediate: true
    }
  }
}
</script>

<style lang="scss" scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  pointer-events: none;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  min-width: 300px;
  
  &.notification-success {
    border-left-color: #28a745;
    .notification-icon i { color: #28a745; }
  }
  
  &.notification-error {
    border-left-color: #dc3545;
    .notification-icon i { color: #dc3545; }
  }
  
  &.notification-warning {
    border-left-color: #ffc107;
    .notification-icon i { color: #ffc107; }
  }
  
  &.notification-info {
    border-left-color: #17a2b8;
    .notification-icon i { color: #17a2b8; }
  }
  
  &.notification-persistent {
    .notification-timer {
      display: none;
    }
  }
}

.notification-icon {
  flex-shrink: 0;
  margin-top: 2px;
  
  i {
    font-size: 18px;
  }
}

.notification-content {
  flex: 1;
  min-width: 0;
  
  .notification-title {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .notification-message {
    margin: 0;
    font-size: 13px;
    color: #6c757d;
    line-height: 1.4;
  }
}

.notification-close {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  
  &:hover {
    background: #f8f9fa;
    color: #495057;
  }
  
  i {
    font-size: 14px;
  }
}

.notification-timer {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #dee2e6;
  animation: timer-progress 5s linear forwards;
}

@keyframes timer-progress {
  from { width: 100%; }
  to { width: 0%; }
}

// Transition animations
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

// Responsive adjustments
@media (max-width: 480px) {
  .notification-container {
    left: 20px;
    right: 20px;
    max-width: none;
  }
  
  .notification {
    min-width: auto;
  }
}
</style>
