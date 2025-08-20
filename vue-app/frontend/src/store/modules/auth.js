import api from '../../services/api'

const state = {
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,
  permissions: [],
  loginAttempts: 0,
  lastLoginAttempt: null
}

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  user: state => state.user,
  userRole: state => state.user?.role || 'viewer',
  permissions: state => state.permissions,
  token: state => state.token,
  canAccess: state => (permission) => {
    return state.permissions.includes(permission)
  },
  hasRole: state => (role) => {
    if (Array.isArray(role)) {
      return role.includes(state.user?.role)
    }
    return state.user?.role === role
  },
  isAdmin: state => state.user?.role === 'admin',
  isOperator: state => ['admin', 'operator'].includes(state.user?.role),
  loginAttempts: state => state.loginAttempts,
  canAttemptLogin: state => {
    if (state.loginAttempts < 5) return true
    if (!state.lastLoginAttempt) return true
    
    const timeSinceLastAttempt = Date.now() - state.lastLoginAttempt
    const lockoutDuration = Math.min(300000, state.loginAttempts * 60000) // Max 5 minutes
    
    return timeSinceLastAttempt > lockoutDuration
  }
}

const mutations = {
  SET_AUTH_DATA(state, { user, token, permissions }) {
    state.user = user
    state.token = token
    state.permissions = permissions || []
    state.isAuthenticated = true
    
    if (token) {
      localStorage.setItem('auth_token', token)
      api.setAuthToken(token)
    }
  },
  
  CLEAR_AUTH_DATA(state) {
    state.user = null
    state.token = null
    state.permissions = []
    state.isAuthenticated = false
    
    localStorage.removeItem('auth_token')
    api.clearAuthToken()
  },
  
  UPDATE_USER(state, userData) {
    if (state.user) {
      state.user = { ...state.user, ...userData }
    }
  },
  
  INCREMENT_LOGIN_ATTEMPTS(state) {
    state.loginAttempts++
    state.lastLoginAttempt = Date.now()
  },
  
  RESET_LOGIN_ATTEMPTS(state) {
    state.loginAttempts = 0
    state.lastLoginAttempt = null
  }
}

const actions = {
  async login({ commit, dispatch }, credentials) {
    try {
      // Check if login attempts are allowed
      if (!getters.canAttemptLogin(state)) {
        const waitTime = Math.ceil((state.loginAttempts * 60000 - (Date.now() - state.lastLoginAttempt)) / 1000)
        throw new Error(`Too many login attempts. Please wait ${waitTime} seconds.`)
      }
      
      const response = await api.post('/auth/admin/login', credentials)
      
      if (response.data.success) {
        const { token, user, expiresIn } = response.data.data
        
        // Get user permissions
        const permissionsResponse = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const permissions = permissionsResponse.data.data.permissions || []
        
        commit('SET_AUTH_DATA', { user, token, permissions })
        commit('RESET_LOGIN_ATTEMPTS')
        
        // Set up token refresh
        dispatch('scheduleTokenRefresh', expiresIn)
        
        dispatch('addNotification', {
          type: 'success',
          title: 'Login Successful',
          message: `Welcome back, ${user.role}!`
        }, { root: true })
        
        return { success: true, user }
      } else {
        throw new Error(response.data.error?.message || 'Login failed')
      }
    } catch (error) {
      commit('INCREMENT_LOGIN_ATTEMPTS')
      
      const errorMessage = error.response?.data?.error?.message || error.message || 'Login failed'
      
      dispatch('addNotification', {
        type: 'error',
        title: 'Login Failed',
        message: errorMessage
      }, { root: true })
      
      throw new Error(errorMessage)
    }
  },
  
  async logout({ commit, dispatch }) {
    try {
      // Call logout endpoint
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      commit('CLEAR_AUTH_DATA')
      
      dispatch('addNotification', {
        type: 'info',
        title: 'Logged Out',
        message: 'You have been logged out successfully'
      }, { root: true })
      
      // Disconnect WebSocket
      dispatch('websocket/disconnect', null, { root: true })
      
      // Clear other store modules
      dispatch('streams/clearStreams', null, { root: true })
      dispatch('system/clearSystemData', null, { root: true })
    }
  },
  
  async verifyToken({ commit, dispatch }, token) {
    try {
      api.setAuthToken(token)
      
      const response = await api.get('/auth/verify')
      
      if (response.data.success) {
        const user = response.data.data.user
        
        // Get full user info with permissions
        const userResponse = await api.get('/auth/me')
        const permissions = userResponse.data.data.permissions || []
        
        commit('SET_AUTH_DATA', { user, token, permissions })
        
        return { success: true, user }
      } else {
        throw new Error('Token verification failed')
      }
    } catch (error) {
      commit('CLEAR_AUTH_DATA')
      throw error
    }
  },
  
  async refreshToken({ commit, dispatch, state }) {
    try {
      if (!state.token) {
        throw new Error('No token to refresh')
      }
      
      const response = await api.post('/auth/refresh')
      
      if (response.data.success) {
        const { token, expiresIn } = response.data.data
        
        commit('SET_AUTH_DATA', {
          user: state.user,
          token,
          permissions: state.permissions
        })
        
        // Schedule next refresh
        dispatch('scheduleTokenRefresh', expiresIn)
        
        return { success: true }
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      
      // If refresh fails, logout user
      dispatch('logout')
      
      throw error
    }
  },
  
  scheduleTokenRefresh({ dispatch }, expiresIn) {
    // Parse expiration time (e.g., "24h", "1d")
    let expirationMs
    if (typeof expiresIn === 'string') {
      const match = expiresIn.match(/^(\d+)([hmd])$/)
      if (match) {
        const value = parseInt(match[1])
        const unit = match[2]
        
        switch (unit) {
          case 'h':
            expirationMs = value * 60 * 60 * 1000
            break
          case 'd':
            expirationMs = value * 24 * 60 * 60 * 1000
            break
          case 'm':
            expirationMs = value * 60 * 1000
            break
          default:
            expirationMs = 24 * 60 * 60 * 1000 // Default 24 hours
        }
      } else {
        expirationMs = 24 * 60 * 60 * 1000 // Default 24 hours
      }
    } else {
      expirationMs = expiresIn || 24 * 60 * 60 * 1000
    }
    
    // Refresh token 5 minutes before expiration
    const refreshTime = expirationMs - (5 * 60 * 1000)
    
    setTimeout(() => {
      dispatch('refreshToken').catch(error => {
        console.error('Scheduled token refresh failed:', error)
      })
    }, refreshTime)
  },
  
  async changePassword({ dispatch }, { currentPassword, newPassword }) {
    try {
      const response = await api.post('/auth/admin/change-password', {
        currentPassword,
        newPassword
      })
      
      if (response.data.success) {
        dispatch('addNotification', {
          type: 'success',
          title: 'Password Changed',
          message: 'Your password has been changed successfully'
        }, { root: true })
        
        return { success: true }
      } else {
        throw new Error(response.data.error?.message || 'Password change failed')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message
      
      dispatch('addNotification', {
        type: 'error',
        title: 'Password Change Failed',
        message: errorMessage
      }, { root: true })
      
      throw new Error(errorMessage)
    }
  },
  
  async checkAuthStatus({ commit, dispatch }) {
    try {
      const response = await api.get('/auth/status')
      
      if (response.data.success && response.data.data.authenticated) {
        const { user } = response.data.data
        
        // Get full permissions
        const userResponse = await api.get('/auth/me')
        const permissions = userResponse.data.data.permissions || []
        
        commit('SET_AUTH_DATA', {
          user,
          token: state.token,
          permissions
        })
        
        return { authenticated: true, user }
      } else {
        commit('CLEAR_AUTH_DATA')
        return { authenticated: false }
      }
    } catch (error) {
      commit('CLEAR_AUTH_DATA')
      return { authenticated: false }
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
