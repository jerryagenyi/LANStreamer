<template>
  <div class="home">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">LANStreamer</h1>
        <p class="hero-subtitle">Professional audio streaming solution for local networks</p>
        <div class="hero-actions">
          <router-link to="/dashboard" class="btn btn-primary btn-lg">
            <i class="fas fa-tachometer-alt me-2"></i>
            Go to Dashboard
          </router-link>
          <router-link to="/client" class="btn btn-outline-primary btn-lg">
            <i class="fas fa-headphones me-2"></i>
            Listen to Streams
          </router-link>
        </div>
      </div>
      
      <div class="hero-image">
        <i class="fas fa-broadcast-tower"></i>
      </div>
    </div>
    
    <div class="features-section">
      <div class="container">
        <h2 class="section-title">Key Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-microphone"></i>
            </div>
            <h3>Audio Device Detection</h3>
            <p>Automatically detect and manage all available audio input devices on your system</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-broadcast-tower"></i>
            </div>
            <h3>Multi-Stream Support</h3>
            <p>Create and manage multiple audio streams simultaneously for different purposes</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-network-wired"></i>
            </div>
            <h3>Local Network Streaming</h3>
            <p>Stream audio over your local network without requiring internet connectivity</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <h3>Mobile-Friendly Interface</h3>
            <p>Access streams from any device on your network with a responsive web interface</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="cta-section">
      <div class="container">
        <h2>Ready to Get Started?</h2>
        <p>Set up your audio streaming system in minutes</p>
        <router-link to="/setup" class="btn btn-success btn-lg">
          <i class="fas fa-wrench me-2"></i>
          Setup Guide
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  
  metaInfo: {
    title: 'LANStreamer - Professional Audio Streaming'
  }
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60vh;
}

.hero-content {
  max-width: 600px;
  
  .hero-title {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    line-height: 1.6;
  }
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  
  .btn {
    padding: 12px 24px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
}

.hero-image {
  flex-shrink: 0;
  margin-left: 2rem;
  
  i {
    font-size: 8rem;
    opacity: 0.8;
    animation: float 3s ease-in-out infinite;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

.features-section {
  padding: 4rem 2rem;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .feature-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    
    i {
      font-size: 2rem;
      color: white;
    }
  }
  
  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 1rem;
  }
  
  p {
    color: #6c757d;
    line-height: 1.6;
    margin: 0;
  }
}

.cta-section {
  background: #2c3e50;
  color: white;
  padding: 4rem 2rem;
  text-align: center;
  
  h2 {
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.9;
  }
  
  .btn {
    padding: 15px 30px;
    font-size: 1.1rem;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .hero-content {
    margin-bottom: 2rem;
    
    .hero-title {
      font-size: 2.5rem;
    }
    
    .hero-subtitle {
      font-size: 1.1rem;
    }
  }
  
  .hero-image {
    margin-left: 0;
    
    i {
      font-size: 6rem;
    }
  }
  
  .hero-actions {
    justify-content: center;
    
    .btn {
      width: 100%;
      justify-content: center;
    }
  }
  
  .features-section {
    padding: 3rem 1rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .cta-section {
    padding: 3rem 1rem;
    
    h2 {
      font-size: 2rem;
    }
    
    p {
      font-size: 1.1rem;
    }
  }
}
</style>
