## File Roles

### HTML
- **index.html**: Single-page application shell with all modals and UI structure

### CSS Files
- **css/main.css**: 
  - CSS custom properties (variables)
  - Base styles and resets
  - Layout components (header, footer, cards)
  - Form elements and buttons
  - Utility classes
  
- **css/theme.css**:
  - Light theme color palette
  - Dark theme color palette (improved contrast)
  - Theme transition animations
  - Color-specific component overrides

- **css/modals.css**:
  - Modal base styles and animations
  - Setup modal styles
  - Reports modal styles
  - Timer fullscreen overlay styles
  - Date picker modal styles

### JavaScript Files
- **js/app.js**:
  - State management (currentDate, config, data)
  - LocalStorage helpers (getStorage, setStorage)
  - PWA installation handling
  - Service Worker registration
  - Dark mode toggle
  - Notification system
  - Toast notifications
  - Confetti effects
  - Modal management
  - Date navigation
  - App initialization

- **js/habits.js**:
  - Habit rendering (renderDay)
  - Score calculation
  - Checkbox toggle
  - Counter increment/decrement
  - Star rating
  - Journal text saving
  - Timer controls (start, pause, reset, add time)
  - Timer fullscreen mode
  - Habit CRUD operations
  - Drag-and-drop reordering

- **js/reports.js**:
  - Report view rendering
  - Calendar grid (current month view)
  - Weekly summary (last 7 days)
  - Custom date range reports
  - Completion statistics
  - Data export (JSON backup)
  - Data import (restore from backup)
  - Streak calculations

## Key Features V2

### Timer Module Improvements
- Fullscreen timer mode with large circular progress ring
- Play/pause controls prominently displayed
- Habit name shown in fullscreen view
- Minimize button to return to normal view
- Visual progress ring animation

### Report View Improvements
- Three tabs: Current Month, Last 7 Days, Custom
- Current Month shows calendar grid for the actual month
- Custom range with date pickers for start/end dates
- Completion count format: "X/Y completed" instead of streaks

### Dark Theme Improvements
- Deeper, richer dark backgrounds
- Better contrast ratios for accessibility
- Softer accent colors that don't strain eyes
- Improved text readability

### Code Organization
- Modular JavaScript with clear separation of concerns
- CSS split by function for easier maintenance
- Consistent naming conventions
- Well-documented functions

## Data Storage Keys
- `myday_config`: Array of habit definitions
- `myday_data`: Object with date keys containing habit values
- `myday_settings`: User preferences (dark mode, notifications)
- `myday_onboarded`: Boolean for first-run state

## Habit Types
1. **Checkbox**: Simple complete/incomplete toggle
2. **Counter**: Increment/decrement with target goal
3. **Timer**: Time tracking with minutes target
4. **Stars**: 5-star rating system
5. **Text**: Journal/notes entry