<template>
  <nav class="main-navigation">
    <div class="nav-header">
      <div class="nav-brand">
        <i class="fas fa-broadcast-tower"></i>
        <span class="brand-text">LANStreamer</span>
      </div>
      
      <button 
        @click="toggleMobileMenu"
        class="mobile-menu-toggle"
        :class="{ 'active': isMobileMenuOpen }"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    
    <div class="nav-menu" :class="{ 'mobile-open': isMobileMenuOpen }">
      <ul class="nav-list">
        <li class="nav-item">
          <router-link 
            to="/dashboard" 
            class="nav-link"
            active-class="active"
          >
            <i class="fas fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </router-link>
        </li>
        
        <li class="nav-item">
          <router-link 
            to="/streams" 
            class="nav-link"
            active-class="active"
          >
            <i class="fas fa-broadcast-tower"></i>
            <span>Streams</span>
          </router-link>
        </li>
        
        <li class="nav-item">
          <router-link 
            to="/system" 
            class="nav-link"
            active-class="active"
          >
            <i class="fas fa-cog"></i>
            <span>System</span>
          </router-link>
        </li>
        
        <li class="nav-item">
          <router-link 
            to="/setup" 
            class="nav-link"
            active-class="active"
          >
            <i class="fas fa-wrench"></i>
            <span>Setup</span>
          </router-link>
        </li>
      </ul>
      
      <div class="nav-footer">
        <div class="user-info">
          <div class="user-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="user-details">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role">{{ userRole }}</span>
          </div>
        </div>
        
        <button @click="logout" class="logout-btn">
          <i class="fas fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'Navigation',
  
  data() {
    return {
      isMobileMenuOpen: false
    }
  },
  
  computed: {
    ...mapGetters(['userName', 'userRole'])
  },
  
  methods: {
    ...mapActions(['logout']),
    
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen
    },
    
    async handleLogout() {
      try {
        await this.logout()
        this.$router.push('/login')
      } catch (error) {
        console.error('Logout failed:', error)
      }
    }
  },
  
  watch: {
    $route() {
      // Close mobile menu when route changes
      this.isMobileMenuOpen = false
    }
  }
}
</script>

<style lang="scss" scoped>
.main-navigation {
  position: fixed;
  top: 0;
  left: 0;
  width: 250px;
  height: 100vh;
  background: #2c3e50;
  color: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.nav-header {
  padding: 20px;
  border-bottom: 1px solid #34495e;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  
  i {
    font-size: 24px;
    color: #3498db;
  }
  
  .brand-text {
    color: white;
  }
}

.mobile-menu-toggle {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  
  span {
    width: 20px;
    height: 2px;
    background: white;
    transition: all 0.3s ease;
  }
  
  &.active {
    span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    
    span:nth-child(2) {
      opacity: 0;
    }
    
    span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -6px);
    }
  }
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  
  &:hover {
    background: #34495e;
    color: white;
    border-left-color: #3498db;
  }
  
  &.active {
    background: #34495e;
    color: white;
    border-left-color: #3498db;
  }
  
  i {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
  
  span {
    font-weight: 500;
  }
}

.nav-footer {
  margin-top: auto;
  padding: 20px;
  border-top: 1px solid #34495e;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #3498db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  i {
    color: white;
    font-size: 18px;
  }
}

.user-details {
  display: flex;
  flex-direction: column;
  
  .user-name {
    font-weight: 600;
    color: white;
    font-size: 14px;
  }
  
  .user-role {
    color: #bdc3c7;
    font-size: 12px;
    text-transform: capitalize;
  }
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover {
    background: #c0392b;
  }
  
  i {
    font-size: 14px;
  }
}

// Mobile responsive
@media (max-width: 768px) {
  .main-navigation {
    width: 100%;
    height: auto;
    position: relative;
  }
  
  .nav-header {
    padding: 15px 20px;
  }
  
  .mobile-menu-toggle {
    display: flex;
  }
  
  .nav-menu {
    display: none;
    
    &.mobile-open {
      display: flex;
    }
  }
  
  .nav-link {
    padding: 15px 20px;
  }
  
  .nav-footer {
    padding: 15px 20px;
  }
}
</style>
