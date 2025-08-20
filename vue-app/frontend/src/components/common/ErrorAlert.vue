<template>
  <div v-if="show" class="alert" :class="alertClass" role="alert">
    <div class="alert-content">
      <div class="alert-icon">
        <i :class="iconClass"></i>
      </div>
      <div class="alert-body">
        <h6 v-if="title" class="alert-title">{{ title }}</h6>
        <div class="alert-message">
          <slot>{{ message }}</slot>
        </div>
        <div v-if="details && showDetails" class="alert-details">
          <small>{{ details }}</small>
        </div>
      </div>
      <div class="alert-actions">
        <button
          v-if="details && !showDetails"
          type="button"
          class="btn btn-link btn-sm p-0 me-2"
          @click="toggleDetails"
        >
          Details
        </button>
        <button
          v-if="dismissible"
          type="button"
          class="btn-close"
          @click="dismiss"
          aria-label="Close"
        ></button>
      </div>
    </div>
    <div v-if="details && showDetails" class="alert-details-expanded">
      <pre><code>{{ details }}</code></pre>
      <button
        type="button"
        class="btn btn-link btn-sm"
        @click="toggleDetails"
      >
        Hide Details
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ErrorAlert',
  
  props: {
    type: {
      type: String,
      default: 'error',
      validator: value => ['error', 'warning', 'info', 'success'].includes(value)
    },
    title: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: ''
    },
    dismissible: {
      type: Boolean,
      default: true
    },
    autoHide: {
      type: Boolean,
      default: false
    },
    autoHideDelay: {
      type: Number,
      default: 5000
    }
  },
  
  data() {
    return {
      show: true,
      showDetails: false,
      autoHideTimer: null
    }
  },
  
  computed: {
    alertClass() {
      const typeMap = {
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info',
        success: 'alert-success'
      }
      
      return [
        typeMap[this.type],
        { 'alert-dismissible': this.dismissible }
      ]
    },
    
    iconClass() {
      const iconMap = {
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
        success: 'fas fa-check-circle'
      }
      
      return iconMap[this.type]
    }
  },
  
  mounted() {
    if (this.autoHide) {
      this.startAutoHideTimer()
    }
  },
  
  beforeUnmount() {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer)
    }
  },
  
  methods: {
    dismiss() {
      this.show = false
      this.$emit('dismissed')
    },
    
    toggleDetails() {
      this.showDetails = !this.showDetails
    },
    
    startAutoHideTimer() {
      this.autoHideTimer = setTimeout(() => {
        this.dismiss()
      }, this.autoHideDelay)
    }
  }
}
</script>

<style lang="scss" scoped>
.alert {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .alert-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  
  .alert-icon {
    flex-shrink: 0;
    font-size: 18px;
    margin-top: 2px;
  }
  
  .alert-body {
    flex: 1;
    min-width: 0;
  }
  
  .alert-title {
    margin: 0 0 4px 0;
    font-weight: 600;
    font-size: 14px;
  }
  
  .alert-message {
    margin: 0;
    font-size: 14px;
    line-height: 1.4;
  }
  
  .alert-details {
    margin-top: 8px;
    color: rgba(0, 0, 0, 0.6);
  }
  
  .alert-actions {
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  
  .alert-details-expanded {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    
    pre {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
      padding: 8px;
      margin: 0 0 8px 0;
      font-size: 12px;
      max-height: 200px;
      overflow-y: auto;
      
      code {
        color: inherit;
        background: none;
      }
    }
  }
}

// Type-specific styling
.alert-danger {
  .alert-icon {
    color: #dc3545;
  }
}

.alert-warning {
  .alert-icon {
    color: #ffc107;
  }
}

.alert-info {
  .alert-icon {
    color: #0dcaf0;
  }
}

.alert-success {
  .alert-icon {
    color: #198754;
  }
}

.btn-link {
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}
</style>
