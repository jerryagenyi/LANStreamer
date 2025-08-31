<template>
  <div
    v-if="show"
    class="modal fade show"
    tabindex="-1"
    style="display: block;"
    @click.self="handleBackdropClick"
  >
    <div class="modal-dialog" :class="modalSizeClass">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i v-if="icon" :class="iconClass" class="me-2"></i>
            {{ title }}
          </h5>
          <button
            v-if="!hideCloseButton"
            type="button"
            class="btn-close"
            @click="cancel"
            aria-label="Close"
          ></button>
        </div>
        
        <div class="modal-body">
          <div v-if="message" class="confirm-message">
            {{ message }}
          </div>
          <slot></slot>
          
          <div v-if="details" class="confirm-details mt-3">
            <small class="text-muted">{{ details }}</small>
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            v-if="!hideCancelButton"
            type="button"
            class="btn btn-secondary"
            @click="cancel"
            :disabled="loading"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="btn"
            :class="confirmButtonClass"
            @click="confirm"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Backdrop -->
  <div v-if="show" class="modal-backdrop fade show"></div>
</template>

<script>
export default {
  name: 'ConfirmModal',
  
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Confirm Action'
    },
    message: {
      type: String,
      default: ''
    },
    details: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: 'Confirm'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    variant: {
      type: String,
      default: 'primary',
      validator: value => ['primary', 'secondary', 'success', 'danger', 'warning', 'info'].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large', 'xl'].includes(value)
    },
    icon: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    },
    hideCloseButton: {
      type: Boolean,
      default: false
    },
    hideCancelButton: {
      type: Boolean,
      default: false
    },
    closeOnBackdrop: {
      type: Boolean,
      default: true
    }
  },
  
  computed: {
    modalSizeClass() {
      const sizeMap = {
        small: 'modal-sm',
        medium: '',
        large: 'modal-lg',
        xl: 'modal-xl'
      }
      
      return sizeMap[this.size]
    },
    
    confirmButtonClass() {
      return `btn-${this.variant}`
    },
    
    iconClass() {
      if (this.icon) {
        return this.icon
      }
      
      const iconMap = {
        primary: 'fas fa-question-circle',
        secondary: 'fas fa-info-circle',
        success: 'fas fa-check-circle',
        danger: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      }
      
      return iconMap[this.variant]
    }
  },
  
  mounted() {
    if (this.show) {
      document.body.classList.add('modal-open')
      document.addEventListener('keydown', this.handleKeydown)
    }
  },
  
  beforeUnmount() {
    document.body.classList.remove('modal-open')
    document.removeEventListener('keydown', this.handleKeydown)
  },
  
  watch: {
    show(newValue) {
      if (newValue) {
        document.body.classList.add('modal-open')
        document.addEventListener('keydown', this.handleKeydown)
      } else {
        document.body.classList.remove('modal-open')
        document.removeEventListener('keydown', this.handleKeydown)
      }
    }
  },
  
  methods: {
    confirm() {
      this.$emit('confirm')
    },
    
    cancel() {
      this.$emit('cancel')
    },
    
    handleBackdropClick() {
      if (this.closeOnBackdrop && !this.loading) {
        this.cancel()
      }
    },
    
    handleKeydown(event) {
      if (event.key === 'Escape' && !this.loading) {
        this.cancel()
      } else if (event.key === 'Enter' && !this.loading) {
        this.confirm()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.modal-content {
  border: none;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  border-bottom: 1px solid #dee2e6;
  
  .modal-title {
    font-weight: 600;
    display: flex;
    align-items: center;
  }
}

.modal-body {
  .confirm-message {
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 0;
  }
  
  .confirm-details {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #dee2e6;
  }
}

.modal-footer {
  border-top: 1px solid #dee2e6;
  
  .btn {
    min-width: 80px;
  }
}

// Icon colors
.text-primary { color: #0d6efd !important; }
.text-secondary { color: #6c757d !important; }
.text-success { color: #198754 !important; }
.text-danger { color: #dc3545 !important; }
.text-warning { color: #ffc107 !important; }
.text-info { color: #0dcaf0 !important; }

// Animation
.modal.fade.show {
  animation: modalFadeIn 0.15s ease-out;
}

.modal-backdrop.fade.show {
  animation: backdropFadeIn 0.15s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes backdropFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.5;
  }
}
</style>
