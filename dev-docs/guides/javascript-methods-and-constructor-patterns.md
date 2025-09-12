# JavaScript Methods and Constructor Patterns

## Constructor Parameter Patterns

### The Problem: Parameter Mismatch
```javascript
// ComponentManager expects this pattern:
class ExpectedComponent {
    constructor(containerId) { // ✅ Accepts parameter
        this.containerId = containerId;
    }
}

// But EventManager was:
class EventManager {
    constructor() { // ❌ No parameters!
        // Hard-coded container ID
    }
}
```

### The Fix: Flexible Constructor
```javascript
class EventManager {
    constructor(containerId = 'event-manager') { // ✅ Default parameter
        this.containerId = containerId; // ✅ Store for later use
        this.eventDetails = { /* ... */ };
        this.isInitialized = false;
        // Don't call init() here - let ComponentManager control it
    }
}
```

## Method Reference Patterns

### Problem: Hard-coded Element IDs
```javascript
// ❌ BAD: Hard-coded ID
render() {
    const container = document.getElementById('event-manager'); // Fixed ID
    if (!container) {
        console.error('❌ Event manager container not found');
        return;
    }
}
```

### Solution: Dynamic Element References
```javascript
// ✅ GOOD: Dynamic ID from constructor
render() {
    const container = document.getElementById(this.containerId); // Dynamic ID
    if (!container) {
        console.error(`❌ Event manager container not found: ${this.containerId}`);
        return;
    }
}
```

## Method Binding and Context

### The 'this' Context Problem
```javascript
class EventManager {
    setupEventListeners() {
        const saveButton = document.getElementById('save-event-settings');
        
        // ❌ PROBLEM: 'this' context lost in event handler
        saveButton.addEventListener('click', function(e) {
            this.saveEventSettings(); // 'this' is the button, not EventManager!
        });
    }
}
```

### Solutions for Method Binding

#### 1. Arrow Functions (Preserves 'this')
```javascript
setupEventListeners() {
    const saveButton = document.getElementById('save-event-settings');
    
    // ✅ GOOD: Arrow function preserves 'this' context
    saveButton.addEventListener('click', (e) => {
        this.saveEventSettings(); // 'this' is EventManager instance
    });
}
```

#### 2. Explicit Binding
```javascript
setupEventListeners() {
    const saveButton = document.getElementById('save-event-settings');
    
    // ✅ GOOD: Explicit binding
    saveButton.addEventListener('click', this.handleSaveClick.bind(this));
}

handleSaveClick(e) {
    e.preventDefault();
    this.saveEventSettings();
}
```

#### 3. Method References with Context
```javascript
setupEventListeners() {
    const saveButton = document.getElementById('save-event-settings');
    
    // ✅ GOOD: Store reference to avoid context loss
    const self = this;
    saveButton.addEventListener('click', function(e) {
        e.preventDefault();
        self.saveEventSettings();
    });
}
```

## Event Handler Cleanup Patterns

### Problem: Duplicate Event Listeners
```javascript
// ❌ BAD: Each render() adds new listeners
render() {
    this.container.innerHTML = this.generateHTML();
    this.setupEventListeners(); // Adds listeners every time
}

setupEventListeners() {
    const button = document.getElementById('save-button');
    button.addEventListener('click', this.handleClick); // Duplicate listeners!
}
```

### Solution: Clean Up Before Adding
```javascript
// ✅ GOOD: Clean up before adding new listeners
setupEventListeners() {
    const saveButton = document.getElementById('save-event-settings');
    
    if (saveButton) {
        // Remove any existing listeners by replacing the element
        const newSaveButton = saveButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);
        
        // Add fresh listener
        newSaveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.saveEventSettings();
        });
    }
}
```

## Async Method Patterns

### Problem: Unhandled Promise Rejections
```javascript
// ❌ BAD: No error handling
async saveEventSettings() {
    const response = await fetch('/api/contact-details', {
        method: 'POST',
        body: JSON.stringify(this.eventDetails)
    });
    const data = await response.json(); // Might throw!
}
```

### Solution: Proper Error Handling
```javascript
// ✅ GOOD: Comprehensive error handling
async saveEventSettings() {
    if (this.isLoading) {
        console.log('🎯 Already loading, returning');
        return;
    }

    try {
        this.isLoading = true;
        this.updateSaveButton(true);

        const response = await fetch('/api/contact-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.eventDetails)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Settings saved successfully', 'success');
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Failed to save settings:', error);
        this.showNotification(`Failed to save: ${error.message}`, 'error');
    } finally {
        this.isLoading = false;
        this.updateSaveButton(false);
    }
}
```

## Method Chaining Patterns

### Basic Method Chaining
```javascript
class EventManager {
    setTitle(title) {
        this.eventDetails.eventTitle = title;
        return this; // Return 'this' for chaining
    }
    
    setSubtitle(subtitle) {
        this.eventDetails.eventSubtitle = subtitle;
        return this;
    }
    
    render() {
        // Render logic
        return this;
    }
}

// Usage:
eventManager
    .setTitle('My Event')
    .setSubtitle('Event Description')
    .render();
```

## Key Principles

1. **Constructor Parameters**: Always accept configuration parameters for flexibility
2. **Method Context**: Use arrow functions or explicit binding to preserve 'this'
3. **Error Handling**: Wrap async operations in try-catch blocks
4. **Event Cleanup**: Remove old listeners before adding new ones
5. **State Management**: Use flags to prevent concurrent operations
6. **Dynamic References**: Use instance properties instead of hard-coded values

These patterns ensure robust, maintainable, and reusable components that work well in complex applications.
