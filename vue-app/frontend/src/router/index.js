import { createRouter, createWebHistory } from 'vue-router'
import store from '../store'

// Import views
import Home from '../views/Home.vue'
import Dashboard from '../views/Dashboard.vue'
import Streams from '../views/Streams.vue'
import StreamDetail from '../views/StreamDetail.vue'
import System from '../views/System.vue'
import Setup from '../views/Setup.vue'
import Login from '../views/Login.vue'
import Client from '../views/Client.vue'
import NotFound from '../views/NotFound.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'LANStreamer',
      public: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: 'Login - LANStreamer',
      public: true,
      hideNavigation: true
    }
  },
  {
    path: '/client',
    name: 'Client',
    component: Client,
    meta: {
      title: 'Audio Streams - LANStreamer',
      public: true,
      layout: 'client'
    }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: Setup,
    meta: {
      title: 'Setup - LANStreamer',
      requiresAuth: true,
      requiresAdmin: true,
      hideNavigation: true
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'Dashboard - LANStreamer',
      requiresAuth: true
    }
  },
  {
    path: '/streams',
    name: 'Streams',
    component: Streams,
    meta: {
      title: 'Stream Management - LANStreamer',
      requiresAuth: true,
      requiresRole: ['admin', 'operator']
    }
  },
  {
    path: '/streams/:id',
    name: 'StreamDetail',
    component: StreamDetail,
    props: true,
    meta: {
      title: 'Stream Details - LANStreamer',
      requiresAuth: true,
      requiresRole: ['admin', 'operator']
    }
  },
  {
    path: '/system',
    name: 'System',
    component: System,
    meta: {
      title: 'System - LANStreamer',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: 'Page Not Found - LANStreamer',
      public: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  // Set page title
  document.title = to.meta.title || 'LANStreamer'
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    const isAuthenticated = store.getters['auth/isAuthenticated']
    
    if (!isAuthenticated) {
      // Try to restore authentication from token
      const token = localStorage.getItem('auth_token')
      if (token) {
        try {
          await store.dispatch('auth/verifyToken', token)
          if (store.getters['auth/isAuthenticated']) {
            return next()
          }
        } catch (error) {
          console.error('Token verification failed:', error)
          localStorage.removeItem('auth_token')
        }
      }
      
      return next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
    }
    
    // Check admin requirement
    if (to.meta.requiresAdmin) {
      const userRole = store.getters['auth/userRole']
      if (userRole !== 'admin') {
        return next({
          name: 'Dashboard',
          query: { error: 'insufficient_permissions' }
        })
      }
    }
    
    // Check role requirement
    if (to.meta.requiresRole) {
      const userRole = store.getters['auth/userRole']
      if (!to.meta.requiresRole.includes(userRole)) {
        return next({
          name: 'Dashboard',
          query: { error: 'insufficient_permissions' }
        })
      }
    }
  }
  
  // Check if setup is required
  if (to.name !== 'Setup' && to.name !== 'Login') {
    try {
      const setupStatus = await store.dispatch('system/checkSetupStatus')
      if (!setupStatus.isComplete && to.meta.requiresAuth) {
        return next({
          name: 'Setup'
        })
      }
    } catch (error) {
      console.error('Setup status check failed:', error)
    }
  }
  
  next()
})

router.afterEach((to, from) => {
  // Track page views
  if (store) {
    store.dispatch('analytics/trackPageView', {
      path: to.path,
      name: to.name,
      timestamp: new Date().toISOString()
    })
  }
})

export default router
