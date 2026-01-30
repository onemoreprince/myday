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
  - Habit card styles with accent colors
  - All input types (checkbox, counter, timer, stars, journal)
  - Responsive design
  - Reduced motion support
  
- **css/theme.css**:
  - Modern Light theme (Slate & Vibrant Pastels - Tailwind-based)
  - Dark theme (Deep Navy & Neon Glow)
  - Theme transition animations
  - Color-specific component overrides
  - SVG gradient overrides for dark mode

- **css/modals.css**:
  - Modal base styles and animations
  - Setup modal with drag-and-drop list
  - Archived habits section
  - Reports modal with three-tab view
  - Calendar grid styles
  - Weekly chart styles
  - Custom date range report
  - Habit completion stats
  - Timer fullscreen overlay styles
  - Hidden date picker positioning

### JavaScript Files
- **js/app.js**:
  - State management (currentDate, undoStack, deferredPrompt)
  - LocalStorage helpers (getStorage, setStorage)
  - PWA installation handling with deferred prompt
  - Service Worker registration
  - Dark mode toggle with system preference detection
  - Notification system with time-based reminders
  - Toast notifications with undo support
  - Multi-burst confetti effects with shapes (rect, circle, triangle, star)
  - Modal management (open/close with animations)
  - Date navigation (prev/next day)
  - Native date picker integration
  - Haptic feedback system
  - Undo stack management
  - App initialization with URL action handling

- **js/habits.js**:
  - Habit rendering (renderDay) with completion stats
  - Score calculation per habit type
  - Completion calculation for date periods
  - Checkbox toggle with animations
  - Counter increment/decrement with progress bar
  - Star rating with animations
  - Journal text saving with character count
  - Timer controls (start, pause, reset, add time)
  - Timer fullscreen mode with circular progress ring
  - Accent color system (6 colors: mint, pink, lavender, peach, blue, yellow)
  - Score board with animated ring and messages
  - Habit CRUD operations (create, edit, archive, restore, delete)
  - Drag-and-drop reordering
  - Setup list rendering with archived section

- **js/reports.js**:
  - Three-tab report view (Month, Week, Custom)
  - Current month calendar grid with activity levels
  - Month navigation (prev/next)
  - Weekly bar chart (last 7 days)
  - Weekly stats (total, average, best day)
  - Custom date range reports
  - Period completion statistics
  - Per-habit completion bars
  - Data export (JSON backup with metadata)
  - Data import (restore from backup)
  - Lifetime points tracking

### PWA Files
- **manifest.json**:
  - App identity and metadata
  - Theme colors and display mode
  - Icons (192px, 512px) with maskable purpose
  - Screenshots for install prompt
  - App shortcuts (Add Habit, View Reports)
  - Share target configuration
  - Categories (lifestyle, productivity, health)

- **sw.js**:
  - Static asset caching (Cache First strategy)
  - HTML navigation (Network First with fallback)
  - Cache versioning and cleanup
  - Push notification handling
  - Notification click actions

## Implemented Features

### Core Functionality
- ✅ Daily habit tracking with 5 input types
- ✅ Points-based scoring system
- ✅ Daily score ring with animated progress
- ✅ Motivational messages based on completion
- ✅ Date navigation (previous/next day)
- ✅ Native date picker for jumping to any date
- ✅ Undo functionality for recent actions

### Habit Types
1. **Checkbox**: Simple complete/incomplete toggle with checkmark animation
2. **Counter**: Increment/decrement with target goal and progress bar
3. **Timer**: Time tracking with minutes target, play/pause/reset/+1m controls
4. **Stars**: 5-star rating system with pop animation
5. **Text**: Journal/notes entry with character count

### Timer Module
- ✅ Fullscreen timer mode with large circular progress ring
- ✅ Play/pause controls prominently displayed
- ✅ Habit name and icon shown in fullscreen
- ✅ Reset and +1 minute buttons
- ✅ Minimize button to return to normal view
- ✅ Visual progress ring animation
- ✅ Auto-save every 10 seconds while running
- ✅ Celebration on target completion

### Reports & Analytics
- ✅ Three tabs: Current Month, Last 7 Days, Custom Range
- ✅ Current Month calendar grid with 4 activity levels
- ✅ Month navigation (prev/next month)
- ✅ Weekly bar chart visualization
- ✅ Weekly stats (total points, daily average, best day)
- ✅ Custom date range picker
- ✅ Per-habit completion percentage bars
- ✅ Lifetime points counter
- ✅ Period completion counter (X/Y format)

### Habit Management
- ✅ Add new habits with customization
- ✅ Edit existing habits
- ✅ Archive habits (hide without deleting data)
- ✅ Restore archived habits
- ✅ Delete habits (with confirmation)
- ✅ Drag-and-drop reordering
- ✅ 6 accent colors (mint, pink, lavender, peach, blue, yellow)
- ✅ Custom emoji icons
- ✅ Configurable point values
- ✅ Target values for counter/timer types

### Theming
- ✅ Light theme (Modern Slate & Vibrant Pastels)
- ✅ Dark theme (Deep Navy & Neon Glow)
- ✅ System preference detection
- ✅ Smooth theme transitions
- ✅ Proper contrast ratios for accessibility

### PWA Features
- ✅ Installable as standalone app
- ✅ Custom install prompt
- ✅ Offline support via Service Worker
- ✅ Push notification support
- ✅ App shortcuts
- ✅ Share target capability
- ✅ Responsive design (mobile-first)

### UX Enhancements
- ✅ Haptic feedback (vibration patterns)
- ✅ Toast notifications with undo
- ✅ Multi-burst confetti celebration
- ✅ Smooth animations throughout
- ✅ Reduced motion support
- ✅ Safe area insets for notched devices
- ✅ Backdrop blur on footer

### Data Management
- ✅ LocalStorage persistence
- ✅ JSON backup export with metadata
- ✅ Backup import/restore
- ✅ Data versioning in exports

## Data Storage Keys
- `myday_config`: Array of habit definitions
- `myday_data`: Object with date keys containing habit values
- `myday_settings`: User preferences (darkMode, notifications, reminderTime, installDismissed)

## Habit Object Structure
```javascript
{
  id: 'h_timestamp',
  title: 'Habit Name',
  icon: '🎯',
  type: 'checkbox|counter|timer|stars|text',
  score: 10,
  target: 8, // for counter/timer only
  accent: 'mint|pink|lavender|peach|blue|yellow',
  active: true|false
}
```

## Future Enhancements (Ideas)
- [ ] Streak tracking and display
- [ ] Weekly/monthly goals
- [ ] Habit categories/groups
- [ ] Cloud sync option
- [ ] Habit templates
- [ ] Statistics trends over time
- [ ] Habit notes/comments per day
- [ ] Reminder per habit (not just global)
- [ ] Widget support
- [ ] Data visualization improvements