import { createStore } from 'vuex'

// Import modules
import auth from './modules/auth'
import streams from './modules/streams'
import system from './modules/system'
import websocket from './modules/websocket'
import errors from './modules/errors'
import analytics from './modules/analytics'

const store = createStore({
  state: {
    appVersion: '1.0.0',
    appName: 'LANStreamer',
    loading: false,
    online: navigator.onLine,
    notifications: []
  },
  
  getters: {
    isLoading: state => state.loading,
    isOnline: state => state.online,
    notifications: state => state.notifications,
    unreadNotifications: state => state.notifications.filter(n => !n.read),
    appInfo: state => ({
      name: state.appName,
      version: state.appVersion
    })
  },
  
  mutations: {
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    SET_ONLINE(state, online) {
      state.online = online
    },
    
    ADD_NOTIFICATION(state, notification) {
      const id = Date.now().toString()
      state.notifications.unshift({
        id,
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      })
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50)
      }
    },
    
    MARK_NOTIFICATION_READ(state, id) {
      const notification = state.notifications.find(n => n.id === id)
      if (notification) {
        notification.read = true
      }
    },
    
    MARK_ALL_NOTIFICATIONS_READ(state) {
      state.notifications.forEach(notification => {
        notification.read = true
      })
    },
    
    REMOVE_NOTIFICATION(state, id) {
      state.notifications = state.notifications.filter(n => n.id !== id)
    },
    
    CLEAR_NOTIFICATIONS(state) {
      state.notifications = []
    }
  },
  
  actions: {
    setLoading({ commit }, loading) {
      commit('SET_LOADING', loading)
    },
    
    setOnline({ commit }, online) {
      commit('SET_ONLINE', online)
    },
    
    addNotification({ commit }, notification) {
      commit('ADD_NOTIFICATION', notification)
    },
    
    markNotificationRead({ commit }, id) {
      commit('MARK_NOTIFICATION_READ', id)
    },
    
    markAllNotificationsRead({ commit }) {
      commit('MARK_ALL_NOTIFICATIONS_READ')
    },
    
    removeNotification({ commit }, id) {
      commit('REMOVE_NOTIFICATION', id)
    },
    
    clearNotifications({ commit }) {
      commit('CLEAR_NOTIFICATIONS')
    },
    
    // Global error handler
    handleError({ commit, dispatch }, error) {
      console.error('Store error:', error)
      
      // Add error to errors module
      dispatch('errors/addError', {
        message: error.message || 'An unknown error occurred',
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
      
      // Add notification for user
      dispatch('addNotification', {
        type: 'error',
        title: 'Error',
        message: error.message || 'An error occurred',
        persistent: false
      })
    },
    
    // Global success handler
    handleSuccess({ dispatch }, message) {
      dispatch('addNotification', {
        type: 'success',
        title: 'Success',
        message,
        persistent: false
      })
    },
    
    // Initialize app
    async initializeApp({ dispatch, commit }) {
      try {
        commit('SET_LOADING', true)
        
        // Initialize WebSocket connection
        await dispatch('websocket/connect')
        
        // Check authentication status
        const token = localStorage.getItem('auth_token')
        if (token) {
          try {
            await dispatch('auth/verifyToken', token)
          } catch (error) {
            console.warn('Token verification failed:', error)
            localStorage.removeItem('auth_token')
          }
        }
        
        // Load initial system status
        await dispatch('system/loadSystemStatus')
        
        // Load streams if authenticated
        if (this.getters['auth/isAuthenticated']) {
          await dispatch('streams/loadStreams')
        }
        
      } catch (error) {
        console.error('App initialization failed:', error)
        dispatch('handleError', error)
      } finally {
        commit('SET_LOADING', false)
      }
    }
  },
  
  modules: {
    auth,
    streams,
    system,
    websocket,
    errors,
    analytics
  },
  
  // Enable strict mode in development
  strict: process.env.NODE_ENV !== 'production'
})

// Handle online/offline events
window.addEventListener('online', () => {
  store.dispatch('setOnline', true)
  store.dispatch('addNotification', {
    type: 'success',
    title: 'Connection Restored',
    message: 'You are back online',
    persistent: false
  })
})

window.addEventListener('offline', () => {
  store.dispatch('setOnline', false)
  store.dispatch('addNotification', {
    type: 'warning',
    title: 'Connection Lost',
    message: 'You are currently offline',
    persistent: true
  })
})

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  store.dispatch('handleError', {
    message: 'An unexpected error occurred',
    stack: event.reason?.stack
  })
})

export default store
