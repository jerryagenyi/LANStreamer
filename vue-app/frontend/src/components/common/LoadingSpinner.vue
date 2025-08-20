<template>
  <div class="loading-spinner" :class="sizeClass">
    <div class="spinner-border" :class="spinnerClass" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    <div v-if="message" class="loading-message">
      {{ message }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  
  props: {
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    },
    message: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'primary',
      validator: value => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'].includes(value)
    }
  },
  
  computed: {
    sizeClass() {
      return `loading-${this.size}`
    },
    
    spinnerClass() {
      const classes = [`text-${this.variant}`]
      
      if (this.size === 'small') {
        classes.push('spinner-border-sm')
      }
      
      return classes
    }
  }
}
</script>

<style lang="scss" scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  &.loading-small {
    gap: 8px;
    
    .loading-message {
      font-size: 12px;
    }
  }
  
  &.loading-medium {
    gap: 12px;
    
    .loading-message {
      font-size: 14px;
    }
  }
  
  &.loading-large {
    gap: 16px;
    
    .spinner-border {
      width: 3rem;
      height: 3rem;
    }
    
    .loading-message {
      font-size: 16px;
      font-weight: 500;
    }
  }
}

.loading-message {
  color: #6c757d;
  text-align: center;
  margin: 0;
}

// Custom spinner animation
@keyframes custom-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.spinner-border {
  animation: custom-spin 1s linear infinite;
}
</style>
