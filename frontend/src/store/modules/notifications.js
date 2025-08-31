const state = {
  notifications: []
}

const getters = {
  notifications: state => state.notifications,
  unreadNotifications: state => state.notifications.filter(n => !n.read)
}

const actions = {
  showSuccess({ commit }, message) {
    commit('ADD_NOTIFICATION', {
      type: 'success',
      title: 'Success',
      message,
      persistent: false
    })
  },
  
  showError({ commit }, message) {
    commit('ADD_NOTIFICATION', {
      type: 'error',
      title: 'Error',
      message,
      persistent: false
    })
  },
  
  showWarning({ commit }, message) {
    commit('ADD_NOTIFICATION', {
      type: 'warning',
      title: 'Warning',
      message,
      persistent: false
    })
  },
  
  showInfo({ commit }, message) {
    commit('ADD_NOTIFICATION', {
      type: 'info',
      title: 'Info',
      message,
      persistent: false
    })
  }
}

const mutations = {
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
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
