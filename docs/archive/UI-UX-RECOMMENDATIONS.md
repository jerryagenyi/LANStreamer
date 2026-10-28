# UI/UX Recommendations for LANStreamer Dashboard

Suggestions for modernising the admin dashboard (e.g. [localhost:3001](http://localhost:3001/)). Implement after stability items in [TODO.md](../TODO.md) are done.

---

## Current state

The dashboard has a solid dark theme. Action buttons in the Audio Streams section (Refresh Devices, Stop All, Start New Stream) could use clearer hierarchy and more consistent, modern styling.

---

## 1. Action button modernisation

**Issues:** Flat buttons, inconsistent visual weight, limited iconography; "Stop All" and future "Start All" don’t stand out enough.

**Suggestions:**

```css
/* Primary actions – rounded, elevated */
.primary-action-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 12px 24px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.primary-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

/* Success/Start */
.success-action-btn {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 12px;
}

/* Danger/Stop */
.danger-action-btn {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  border-radius: 12px;
}

/* Secondary */
.secondary-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}
```

---

## 2. Icons

- Consider **Lucide Icons** or **Heroicons** instead of Material Icons for consistency.
- Use 20–24px for better visibility; add subtle hover animation.
- **Start New Stream:** play circle or + in circle.
- **Stop All:** stop/pause with warning colour.
- **Start All:** stacked play or fast-forward.
- **Refresh Devices:** rotating arrow with spin on click.
- **Live:** pulsing dot instead of static.

---

## 3. Button layout

Group actions with clear hierarchy and spacing, e.g.:

- Section: “Audio Streams” with “4/4 Live” badge (animated).
- Row: [Refresh] [Start All] [Stop All], then [Start New Stream] as primary.

---

## 4. Status badge (“4/4 Live”)

- Larger, more prominent.
- Pulsing animation for active streams.
- Optional: gradient + glass effect.

```css
.live-badge {
  background: rgba(56, 239, 125, 0.15);
  border: 2px solid rgba(56, 239, 125, 0.5);
  border-radius: 20px;
  padding: 8px 16px;
  backdrop-filter: blur(10px);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## 5. Stream cards

- Border-radius 12–16px.
- Subtle hover elevation and separation between cards.
- Optional glass-morphism.

---

## 6. Page layout

- **Header:** More padding; optional glass bar; logo with subtle emphasis.
- **Security warning:** Clearer treatment, optional dismiss; amber/orange.
- **Server status:** Animated “online” indicator; card style; colour-coded controls.

---

## 7. Responsive button group (markup)

```html
<div class="action-button-group">
  <button class="action-btn secondary">
    <svg class="icon">...</svg>
    <span>Refresh Devices</span>
  </button>
  <button class="action-btn success">
    <svg class="icon">...</svg>
    <span>Start All</span>
  </button>
  <button class="action-btn danger">
    <svg class="icon">...</svg>
    <span>Stop All</span>
  </button>
  <button class="action-btn primary highlight">
    <svg class="icon">...</svg>
    <span>Start New Stream</span>
  </button>
</div>
```

---

## 8. Animation and micro-interactions

- Button hover: slight lift and glow.
- Live indicators: pulse.
- Uptime: smooth value updates.
- Loading: skeleton or shimmer.
- Success: short confirmation feedback.

---

## 9. Colour palette (CSS variables)

```css
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --danger-gradient: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  --warning-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);

  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);

  --shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.2);
  --shadow-large: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

## 10. Accessibility

- Buttons: min-height 44px for touch.
- Clear focus outlines.
- Sufficient contrast (WCAG).
- ARIA labels for icon-only buttons.
- Keyboard navigation.

---

## Implementation priority

1. **High:** Button styling and icons.
2. **Medium:** Glass effects, animations.
3. **Low:** Advanced micro-interactions.

Focus on stability and feature completeness (see [TODO.md](../TODO.md)) before deep UI polish.
