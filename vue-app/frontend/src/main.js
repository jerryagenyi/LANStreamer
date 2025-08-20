/**
 * LANStreamer Frontend Application Entry Point
 *
 * This file initializes the Vue.js 3 application with all necessary plugins and configurations:
 * - Vue Router for single-page application navigation
 * - Vuex store for centralized state management
 * - Bootstrap 5 for responsive UI components
 * - Toast notifications for user feedback
 * - Global components registration
 * - Global filters and utilities
 * - Error handling and logging
 *
 * The application provides a modern, responsive web interface for managing
 * audio streams and monitoring system status.
 */

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Bootstrap CSS and JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// FontAwesome
import '@fortawesome/fontawesome-free/css/all.min.css'

// Toast notifications
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Perfect Scrollbar
import PerfectScrollbar from 'vue3-perfect-scrollbar'
import 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css'

// Global styles
import './assets/css/main.css'

// Global components
import LoadingSpinner from './components/common/LoadingSpinner.vue'
import ErrorAlert from './components/common/ErrorAlert.vue'
import ConfirmModal from './components/common/ConfirmModal.vue'

const app = createApp(App)

// Configure toast notifications
const toastOptions = {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
}

// Register global components
app.component('LoadingSpinner', LoadingSpinner)
app.component('ErrorAlert', ErrorAlert)
app.component('ConfirmModal', ConfirmModal)

// Use plugins
app.use(store)
app.use(router)
app.use(Toast, toastOptions)
app.use(PerfectScrollbar)

// Global properties
app.config.globalProperties.$filters = {
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
  
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  },
  
  formatDate(date) {
    if (!date) return ''
    return new Date(date).toLocaleString()
  },
  
  capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

// Global error handler
app.config.errorHandler = (error, instance, info) => {
  console.error('Global error:', error)
  console.error('Component info:', info)
  
  // Send error to store for logging
  if (store) {
    store.dispatch('errors/addError', {
      message: error.message,
      stack: error.stack,
      component: info,
      timestamp: new Date().toISOString()
    })
  }
}

// Mount the app
app.mount('#app')

export default app
