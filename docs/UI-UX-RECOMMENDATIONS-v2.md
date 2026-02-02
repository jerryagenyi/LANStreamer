# UI/UX Recommendations for LANStreamer Dashboard v2

**Enhanced glassmorphism edition** - inspired by premium frosted glass UI with softer transparency, layered depth, and elegant gradients.

Reference: [Gradient UI/UX Elements](https://www.freepik.com/free-vector/gradient-ui-ux-elements-background_16829080.htm)

Implement after stability items in [TODO.md](../TODO.md) are done.

---

## Design Philosophy

This version focuses on **premium glassmorphism**:
- Lower opacity for subtler glass (0.03-0.08)
- Rich backdrop blur with saturation boost
- Multi-layered depth with inset shadows
- Smooth, professional animation curves
- Performance-aware with accessibility fallbacks

---

## Current State

The dashboard has a solid dark theme. Action buttons need clearer hierarchy and modern glassmorphism styling.

---

## 1. Glass Card System (Foundation)

**The core building block for all glass elements.**

```css
/* Premium glass card base */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

/* Elevated variant (for key cards) */
.glass-card-elevated {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.03) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(102, 126, 234, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Inset variant (for nested content) */
.glass-card-inset {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow:
    inset 0 2px 8px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(255, 255, 255, 0.05);
}
```

---

## 2. Gradient Background System

**Softer, multi-layer background with ambient animation.**

```css
/* Main page background */
.body-bg {
  background:
    /* Static gradient base */
    linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%),
    /* Animated ambient glow */
    radial-gradient(
      circle at 20% 80%,
      rgba(102, 126, 234, 0.15) 0%,
      transparent 40%
    ),
    radial-gradient(
      circle at 80% 20%,
      rgba(118, 75, 162, 0.1) 0%,
      transparent 40%
    );
  background-attachment: fixed;
  min-height: 100vh;
}

/* Optional: subtle animation (respects prefers-reduced-motion) */
@keyframes ambientShift {
  0%, 100% {
    background-position: 0% 50%, 100% 50%;
  }
  50% {
    background-position: 100% 50%, 0% 50%;
  }
}

.body-bg-animated {
  animation: ambientShift 20s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .body-bg-animated {
    animation: none;
  }
}
```

---

## 3. Premium Glass Buttons

**Semi-transparent gradients with frosted edge effects.**

```css
/* Base button with glass effect */
.btn-glass {
  position: relative;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Primary - purple gradient */
.btn-glass-primary {
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.8) 0%,
    rgba(118, 75, 162, 0.8) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
}

.btn-glass-primary:hover {
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.9) 0%,
    rgba(118, 75, 162, 0.9) 100%
  );
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow:
    0 8px 24px rgba(102, 126, 234, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Success - green gradient */
.btn-glass-success {
  background: linear-gradient(
    135deg,
    rgba(17, 153, 142, 0.8) 0%,
    rgba(56, 239, 125, 0.8) 100%
  );
  border: 1px solid rgba(56, 239, 125, 0.3);
  color: white;
}

.btn-glass-success:hover {
  box-shadow:
    0 8px 24px rgba(56, 239, 125, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Danger - red gradient */
.btn-glass-danger {
  background: linear-gradient(
    135deg,
    rgba(235, 51, 73, 0.8) 0%,
    rgba(244, 92, 67, 0.8) 100%
  );
  border: 1px solid rgba(244, 92, 67, 0.3);
  color: white;
}

.btn-glass-danger:hover {
  box-shadow:
    0 8px 24px rgba(235, 51, 73, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Secondary - glass outline */
.btn-glass-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.btn-glass-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Icon + text layout */
.btn-glass {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-glass svg {
  width: 18px;
  height: 18px;
}
```

---

## 4. Enhanced Live Badge

**Dual-layer pulsing effect with ambient glow.**

```css
/* Live status badge */
.live-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(56, 239, 125, 0.1);
  border: 1px solid rgba(56, 239, 125, 0.3);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  color: #38ef7d;
  font-size: 12px;
  font-weight: 600;
  box-shadow:
    0 0 20px rgba(56, 239, 125, 0.2),
    inset 0 1px 0 rgba(56, 239, 125, 0.1);
}

/* Pulsing dot indicator */
.live-badge::before {
  content: '';
  position: absolute;
  left: 8px;
  width: 8px;
  height: 8px;
  background: #38ef7d;
  border-radius: 50%;
  box-shadow: 0 0 8px #38ef7d;
  animation: livePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.live-badge span {
  padding-left: 12px;
}

/* Badge ambient glow animation */
.live-badge {
  animation: badgeGlow 3s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

@keyframes badgeGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(56, 239, 125, 0.2),
      inset 0 1px 0 rgba(56, 239, 125, 0.1);
  }
  50% {
    box-shadow:
      0 0 30px rgba(56, 239, 125, 0.4),
      inset 0 1px 0 rgba(56, 239, 125, 0.15);
  }
}
```

---

## 5. Stream Cards

**Enhanced depth with optional subtle 3D on hover.**

```css
/* Stream card base */
.stream-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stream-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

/* Optional: subtle 3D perspective on hover */
.stream-card-3d {
  perspective: 1000px;
}

.stream-card-3d .stream-card {
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stream-card-3d .stream-card:hover {
  transform: rotateX(2deg) rotateY(-2deg) translateZ(10px);
}

/* IMPORTANT: Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .stream-card-3d .stream-card:hover {
    transform: none;
  }
}
```

---

## 6. Glass Form Inputs

**Frosted glass input fields with focus states.**

```css
/* Glass input base */
.input-glass {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.input-glass::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.input-glass:focus {
  outline: none;
  border-color: rgba(102, 126, 234, 0.5);
  background: rgba(0, 0, 0, 0.2);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-glass:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Textarea variant */
.textarea-glass {
  min-height: 100px;
  resize: vertical;
}
```

---

## 7. Glass Navigation Bar

**Frosted header with blur effect.**

```css
/* Glass header */
.header-glass {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 12, 41, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

/* Logo with subtle glow */
.logo-glow {
  filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5));
}
```

---

## 8. Enhanced Animation Curves

**Professional transitions using Material Design curves.**

```css
:root {
  /* Material Design animation curves */
  --ease-emphasized: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-emphasized-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.6, 1);
  --ease-standard-decelerate: cubic-bezier(0, 0, 0.6, 1);
  --ease-standard-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-linear: cubic-bezier(0, 0, 1, 1);
}

/* Usage examples */
.button-hover {
  transition: all 0.3s var(--ease-emphasized);
}

.card-lift {
  transition: transform 0.4s var(--ease-emphasized-decelerate);
}

.fade-in {
  animation: fadeIn 0.3s var(--ease-emphasized);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 9. Colour Palette (Enhanced)

```css
:root {
  /* Glass system */
  --glass-bg-subtle: rgba(255, 255, 255, 0.03);
  --glass-bg-mid: rgba(255, 255, 255, 0.05);
  --glass-bg-strong: rgba(255, 255, 255, 0.08);

  --glass-border-subtle: rgba(255, 255, 255, 0.08);
  --glass-border-mid: rgba(255, 255, 255, 0.12);
  --glass-border-strong: rgba(255, 255, 255, 0.2);

  /* Gradient overlays */
  --gradient-purple: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-green: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --gradient-red: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  --gradient-orange: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

  /* Glow effects */
  --glow-purple: 0 0 20px rgba(102, 126, 234, 0.4);
  --glow-green: 0 0 20px rgba(56, 239, 125, 0.4);
  --glow-red: 0 0 20px rgba(235, 51, 73, 0.4);

  /* Shadow system (with colored variants) */
  --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-mid: 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-strong: 0 8px 32px rgba(0, 0, 0, 0.4);

  --shadow-glass:
    0 4px 24px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Animation curves */
  --ease-emphasized: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.6, 1);
}
```

---

## 10. Accessibility (Enhanced)

**Critical for animated and 3D effects.**

```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .stream-card-3d .stream-card:hover {
    transform: none !important;
  }

  .body-bg-animated {
    animation: none !important;
  }
}

/* Focus states for keyboard navigation */
.btn-glass:focus-visible,
.input-glass:focus-visible {
  outline: 2px solid rgba(102, 126, 234, 0.6);
  outline-offset: 2px;
}

/* Touch target sizing */
.btn-glass,
.glass-card {
  min-height: 44px;
  min-width: 44px;
}

/* ARIA for icon-only buttons */
button[aria-label=""] {
  position: relative;
}
```

---

## 11. Icon Recommendations

**Maintain Material Symbols Rounded for consistency, add hover states.**

```css
/* Icon styling */
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.2s var(--ease-emphasized);
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.05);
}

/* Icon spin on action */
.icon-spin {
  animation: spin 1s var(--ease-emphasized);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 12. Responsive Button Group (Markup)

```html
<div class="action-button-group flex flex-wrap items-center gap-3">
  <!-- Secondary: Refresh Devices -->
  <button class="btn-glass btn-glass-secondary">
    <svg class="icon-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
    <span>Refresh Devices</span>
  </button>

  <!-- Success: Start All -->
  <button class="btn-glass btn-glass-success">
    <svg class="icon-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
    <span>Start All</span>
  </button>

  <!-- Danger: Stop All -->
  <button class="btn-glass btn-glass-danger">
    <svg class="icon-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
    <span>Stop All</span>
  </button>

  <!-- Primary (highlight): Start New Stream -->
  <button class="btn-glass btn-glass-primary">
    <svg class="icon-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
    <span>Start New Stream</span>
  </button>
</div>

<!-- Live badge -->
<div class="live-badge">
  <span>4/4 Live</span>
</div>
```

---

## 13. Micro-interactions

**Subtle feedback for user actions.**

```css
/* Success toast */
.toast-success {
  background: rgba(56, 239, 125, 0.1);
  border: 1px solid rgba(56, 239, 125, 0.3);
  backdrop-filter: blur(20px);
  animation: slideIn 0.3s var(--ease-emphasized);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Loading shimmer */
.shimmer {
  position: relative;
  overflow: hidden;
}

.shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  to {
    left: 100%;
  }
}
```

---

## Implementation Priority

### Phase 1: Foundation (Start Here)
1. **Glass card system** - Reusable base for all components
2. **Button styling** - Core interactions with glass effect
3. **Gradient background** - Set the stage

### Phase 2: Enhancement
4. **Live badge** - Dual-layer pulse effect
5. **Form inputs** - Glass fields with focus states
6. **Animation curves** - Switch to emphasized easing

### Phase 3: Polish (Optional)
7. **3D hover effects** - Add with reduced-motion fallback
8. **Ambient animations** - Slow background shifts
9. **Advanced micro-interactions** - Shimmer, slide-in

---

## Performance Notes

- **Backdrop-filter** can be expensive - limit to visible elements
- Use `will-change` sparingly and only for animating properties
- Test on lower-end devices
- Provide reduced-motion alternatives

---

## Browser Compatibility

| Feature | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| backdrop-filter | ✅ 76+ | ✅ 103+ | ✅ 9+ |
| cubic-bezier | ✅ | ✅ | ✅ |
| 3D transforms | ✅ | ✅ | ✅ |
| prefers-reduced-motion | ✅ | ✅ | ✅ |

---

## Version History

- **v2** - Enhanced glassmorphism with premium frosted glass, layered depth, and professional animation curves
- [v1](./UI-UX-RECOMMENDATIONS.md) - Original recommendations with basic glass effects
