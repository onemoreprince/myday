/* ==========================================
   HABITS.JS - Habit Rendering & Interactions
   ========================================== */

const Habits = (function () {
    'use strict';

    // === STATE ===
    let timerIntervals = {};
    let timerStartTimes = {};
    let editingHabitId = null;
    let draggedItem = null;
    let currentFullscreenHabitId = null;

    // === ACCENT COLOR UTILITIES ===
    const ACCENT_COLORS = {
        mint: { light: 'var(--p-mint)', dark: 'var(--p-mint-dark)', gradient: 'linear-gradient(90deg, var(--p-mint), var(--p-mint-dark))' },
        pink: { light: 'var(--p-pink)', dark: 'var(--p-pink-dark)', gradient: 'linear-gradient(90deg, var(--p-pink), var(--p-pink-dark))' },
        lavender: { light: 'var(--p-lavender)', dark: 'var(--p-lavender-dark)', gradient: 'linear-gradient(90deg, var(--p-lavender), var(--p-lavender-dark))' },
        peach: { light: 'var(--p-peach)', dark: 'var(--p-peach-dark)', gradient: 'linear-gradient(90deg, var(--p-peach), var(--p-peach-dark))' },
        blue: { light: 'var(--p-blue)', dark: 'var(--p-blue-dark)', gradient: 'linear-gradient(90deg, var(--p-blue), var(--p-blue-dark))' },
        yellow: { light: 'var(--p-yellow)', dark: 'var(--p-yellow-dark)', gradient: 'linear-gradient(90deg, var(--p-yellow), var(--p-yellow-dark))' }
    };

    function getAccentColors(accent) {
        return ACCENT_COLORS[accent] || ACCENT_COLORS.mint;
    }

    // === SCORE CALCULATION ===
    function calculateHabitScore(habit, value) {
        if (!value && value !== 0) return 0;
        const score = parseInt(habit.score) || 0;

        switch (habit.type) {
            case 'checkbox':
                return value ? score : 0;
            case 'stars':
                return Math.round((value / 5) * score);
            case 'text':
                return value.length > 2 ? score : 0;
            case 'counter':
            case 'timer':
                const progress = Math.min(value / (habit.target || 1), 1);
                return Math.round(progress * score);
            default:
                return 0;
        }
    }

    // === COMPLETION CALCULATION ===
    function calculateCompletionForPeriod(habitId, startDate, endDate, config) {
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const habit = config.find(h => h.id === habitId);
        if (!habit) return { completed: 0, total: 0 };

        let completed = 0;
        let total = 0;
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            const dStr = App.getDateStr(current);
            const dayData = data[dStr];
            total++;

            if (dayData && dayData[habitId] !== undefined) {
                const score = calculateHabitScore(habit, dayData[habitId]);
                if (score > 0) completed++;
            }

            current.setDate(current.getDate() + 1);
        }

        return { completed, total };
    }

    // === FORMAT TIME ===
    function formatTime(minutes) {
        const mins = Math.floor(minutes);
        const secs = Math.round((minutes - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // === HTML BUILDERS ===
    function buildCheckboxHtml(habit, val) {
        const colors = getAccentColors(habit.accent);
        return `
            <div class="checkbox-wrapper ${val ? 'checked' : ''}" 
                 onclick="Habits.toggleCheckbox('${habit.id}')"
                 tabindex="0"
                 role="checkbox"
                 aria-checked="${val ? 'true' : 'false'}"
                 style="${val ? `background: ${colors.dark};` : ''}">
                <div class="custom-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span class="check-text">${val ? 'Completed!' : 'Mark as Done'}</span>
            </div>`;
    }

    function buildCounterHtml(habit, val) {
        const currentVal = val || 0;
        const target = habit.target || 8;
        const percentage = Math.min((currentVal / target) * 100, 100);
        const colors = getAccentColors(habit.accent);

        return `
            <div class="counter-wrapper">
                <button class="counter-btn minus" onclick="Habits.adjustCounter('${habit.id}', -1)" ${currentVal <= 0 ? 'disabled' : ''}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <div class="counter-display">
                    <span class="counter-value">${currentVal}</span>
                    <span class="counter-target">/ ${target}</span>
                    <div class="counter-progress-bg">
                        <div class="counter-progress-fill" style="width: ${percentage}%; background: ${colors.gradient};"></div>
                    </div>
                </div>
                <button class="counter-btn plus" onclick="Habits.adjustCounter('${habit.id}', 1)" style="background: ${colors.light}; color: ${colors.dark};">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>`;
    }

    function buildTimerHtml(habit, val) {
        const currentMins = val || 0;
        const target = habit.target || 10;
        const percentage = Math.min((currentMins / target) * 100, 100);
        const isRunning = timerIntervals[habit.id] !== undefined;
        const colors = getAccentColors(habit.accent);

        return `
            <div class="timer-wrapper" data-habit-id="${habit.id}">
                <div class="timer-display">
                    <span class="timer-value" id="timer-${habit.id}">${formatTime(currentMins)}</span>
                    <span class="timer-target">/ ${target} min</span>
                </div>
                <div class="timer-progress-bg">
                    <div class="timer-progress-fill" id="timer-progress-${habit.id}" style="width: ${percentage}%; background: ${colors.gradient};"></div>
                </div>
                <div class="timer-controls">
                    <button class="timer-btn ${isRunning ? 'pause' : 'play'}" 
                            onclick="Habits.toggleTimer('${habit.id}', ${target})" 
                            id="timer-btn-${habit.id}"
                            style="background: ${isRunning ? colors.light : colors.light}; color: ${colors.dark};">
                        ${isRunning ? `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
                            </svg>
                        ` : `
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        `}
                    </button>
                    <button class="timer-btn reset" onclick="Habits.resetTimer('${habit.id}')" title="Reset timer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                    </button>
                    <button class="timer-btn add-time" onclick="Habits.addTimerMinutes('${habit.id}', 1)" title="Add 1 minute">
                        +1m
                    </button>
                    <button class="timer-btn fullscreen" onclick="Habits.openTimerFullscreen('${habit.id}')" title="Fullscreen">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                </div>
            </div>`;
    }

    function buildStarsHtml(habit, val) {
        const colors = getAccentColors(habit.accent);
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const isActive = i <= (val || 0);
            starsHtml += `<span class="${isActive ? 'active' : ''}" 
                            onclick="Habits.setStars('${habit.id}', ${i})"
                            role="button"
                            aria-label="Rate ${i} stars"
                            style="${isActive ? `color: ${colors.dark};` : ''}"
                            data-index="${i}">★</span>`;
        }
        return `<div class="star-rating" role="group" aria-label="Rating" data-accent="${habit.accent}">${starsHtml}</div>`;
    }

    function buildTextHtml(habit, val) {
        const charCount = (val || '').length;
        const colors = getAccentColors(habit.accent);
        return `
            <div class="journal-wrapper">
                <textarea class="journal-input" 
                          placeholder="What's on your mind..." 
                          onblur="Habits.saveText('${habit.id}', this.value)"
                          onfocus="this.style.borderColor='${colors.dark}'"
                          oninput="Habits.updateCharCount(this)"
                          aria-label="Journal entry"
                          data-accent="${habit.accent}">${val || ''}</textarea>
                <span class="journal-char-count">${charCount} chars</span>
            </div>`;
    }

    function buildHabitInputHtml(habit, val) {
        switch (habit.type) {
            case 'checkbox': return buildCheckboxHtml(habit, val);
            case 'counter': return buildCounterHtml(habit, val);
            case 'timer': return buildTimerHtml(habit, val);
            case 'stars': return buildStarsHtml(habit, val);
            case 'text': return buildTextHtml(habit, val);
            default: return '';
        }
    }


// === RENDER DAY ===
    function renderDay() {
        const currentDate = App.currentDate();
        const dateStr = App.getDateStr(currentDate);
        const todayStr = App.getDateStr(new Date());
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const activeHabits = config.filter(h => h.active !== false);
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const daysData = data[dateStr] || {};

        // === CHANGED: Header Logic ===
        const isToday = todayStr === dateStr;
        const isFuture = dateStr > todayStr;
        const isPast = dateStr < todayStr;

        // Big Date (e.g., "11")
        const dayNumber = currentDate.getDate();
        // Day Name (e.g., "Wednesday")
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        // Full Month Year (e.g., "Feb 2026")
        const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        let headerTitle = `${dayName}`;
        let headerSub = `${dayNumber} ${monthYear}`;

        // Add dots based on state
        if (isPast) {
            headerTitle = `🟡 ${headerTitle}`; // Yellow dot left
        } else if (isFuture) {
            headerTitle = `${headerTitle} 🔴`; // Red dot right
        } else {
            // Optional: You can keep it clean for Today, or add a green dot
             headerTitle = `🌱 ${headerTitle}`; 
        }

        document.getElementById('dayName').textContent = headerTitle;
        document.getElementById('fullDate').textContent = headerSub;
        // =============================

        // Check empty state
        if (activeHabits.length === 0) {
            document.getElementById('habitList').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            updateScoreBoard(0, 0);
            return;
        } else {
            document.getElementById('habitList').style.display = 'flex';
            document.getElementById('emptyState').style.display = 'none';
        }

        // Get period for completion calculation (current month)
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Render Habits
        const listEl = document.getElementById('habitList');
        listEl.innerHTML = '';

        let totalScore = 0;
        let maxPossibleScore = 0;
        let completedCount = 0;

        activeHabits.forEach(habit => {
            const val = daysData[habit.id];
            const habitScore = parseInt(habit.score) || 0;
            maxPossibleScore += habitScore;

            const earned = calculateHabitScore(habit, val);
            totalScore += earned;
            if (earned > 0) completedCount++;

            // Calculate completion for the month
            const completion = calculateCompletionForPeriod(habit.id, monthStart, monthEnd, config);
            const accent = habit.accent || 'mint';
            const colors = getAccentColors(accent);

            const card = document.createElement('div');
            card.className = 'habit-card';
            card.dataset.type = habit.type;
            card.dataset.accent = accent;

            const inputHtml = buildHabitInputHtml(habit, val);

            card.innerHTML = `
                <div class="habit-header">
                    <div class="habit-title-section">
                        <div class="habit-title">${habit.icon} ${habit.title}</div>
                        <div class="habit-completion" style="color: ${colors.dark};">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            ${completion.completed}/${completion.total} this month
                        </div>
                    </div>
                    <div class="habit-meta">
                        <div class="habit-score-badge ${earned > 0 ? 'earned' : ''}"
style="${earned > 0 ? `background: ${colors.light}; color: ${colors.dark};` : ''}">${earned} / ${habitScore} pts</div>
</div>
</div>
    ${inputHtml}
`;
            listEl.appendChild(card);
        });
        updateScoreBoard(totalScore, maxPossibleScore, completedCount, activeHabits.length);
    }

    // === SCORE BOARD ===
    function updateScoreBoard(current, max, completed = 0, total = 0) {
        const ring = document.getElementById('scoreProgress');
        const display = document.getElementById('dailyScore');
        const msg = document.getElementById('scoreMessage');
        const subtext = document.getElementById('scoreSubtext');

        const oldScore = parseInt(display.textContent) || 0;
        if (current !== oldScore) {
            display.classList.add('bump');
            setTimeout(() => display.classList.remove('bump'), 300);
        }
        display.textContent = current;

        const percentage = max > 0 ? (current / max) : 0;
        const offset = 100 - (percentage * 100);

        setTimeout(() => {
            ring.style.strokeDashoffset = Math.max(0, offset);
        }, 100);

        const messages = [
            { threshold: 0, text: "Let's start the day! 🌱", sub: "" },
            { threshold: 0.01, text: "Good start! 🌤️", sub: `${completed} of ${total} habits done` },
            { threshold: 0.5, text: "Doing great! 🚀", sub: `${completed} of ${total} habits done` },
            { threshold: 0.8, text: "Almost there! 🔥", sub: "Just a little more!" },
            { threshold: 1, text: "Perfect day! 🎉", sub: "You're amazing! (tap for confetti)" }
        ];

        for (let i = messages.length - 1; i >= 0; i--) {
            if (percentage >= messages[i].threshold) {
                msg.textContent = messages[i].text;
                subtext.textContent = messages[i].sub;
                break;
            }
        }
    }

    // === TIMER FUNCTIONS ===
    function toggleTimer(habitId, target) {
        App.haptic('medium');

        if (timerIntervals[habitId]) {
            // Stop timer - save final value
            clearInterval(timerIntervals[habitId]);

            const elapsed = (Date.now() - timerStartTimes[habitId]) / 60000;
            const dateStr = App.getDateStr(App.currentDate());
            const data = App.getStorage(App.DB_KEYS.DATA, {});
            const baseValue = (data[dateStr]?.[habitId]) || 0;

            // Only save if we haven't saved this session yet
            if (timerStartTimes[habitId + '_base'] !== undefined) {
                const newValue = timerStartTimes[habitId + '_base'] + elapsed;
                updateEntry(habitId, newValue, false);
            }

            delete timerIntervals[habitId];
            delete timerStartTimes[habitId];
            delete timerStartTimes[habitId + '_base'];

            updateTimerButton(habitId, false);
            updateFullscreenPlayPause(false);
        } else {
            // Start timer
            const dateStr = App.getDateStr(App.currentDate());
            const data = App.getStorage(App.DB_KEYS.DATA, {});
            const currentMins = (data[dateStr]?.[habitId]) || 0;

            timerStartTimes[habitId] = Date.now();
            timerStartTimes[habitId + '_base'] = currentMins;

            timerIntervals[habitId] = setInterval(() => {
                const elapsed = (Date.now() - timerStartTimes[habitId]) / 60000;
                const newValue = timerStartTimes[habitId + '_base'] + elapsed;

                // Update main display
                const timerDisplay = document.getElementById(`timer-${habitId}`);
                if (timerDisplay) {
                    timerDisplay.textContent = formatTime(newValue);
                }

                const percentage = Math.min((newValue / target) * 100, 100);
                const progressFill = document.getElementById(`timer-progress-${habitId}`);
                if (progressFill) {
                    progressFill.style.width = `${percentage}%`;
                }

                // Update fullscreen if open
                if (currentFullscreenHabitId === habitId) {
                    updateFullscreenTimer(newValue, target);
                }

                // Save periodically (every 10 seconds)
                if (Math.floor(elapsed * 6) !== Math.floor((elapsed - 1 / 6) * 6)) {
                    updateEntry(habitId, newValue, false);
                }

                // Check if target reached
                if (newValue >= target && timerStartTimes[habitId + '_base'] < target) {
                    App.haptic('success');
                    App.triggerConfetti();
                    timerStartTimes[habitId + '_base'] = target; // Prevent multiple triggers
                }
            }, 1000);

            updateTimerButton(habitId, true);
            updateFullscreenPlayPause(true);
        }
    }

    function updateTimerButton(habitId, isRunning) {
        const btn = document.getElementById(`timer-btn-${habitId}`);
        if (btn) {
            btn.className = `timer-btn ${isRunning ? 'pause' : 'play'}`;
            btn.innerHTML = isRunning ?
                `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"></rect>
                <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>` :
                `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>`;
        }
    }

    function resetTimer(habitId) {
        App.haptic('medium');
        if (timerIntervals[habitId]) {
            clearInterval(timerIntervals[habitId]);
            delete timerIntervals[habitId];
            delete timerStartTimes[habitId];
            delete timerStartTimes[habitId + '_base'];
        }
        updateEntry(habitId, 0, true);

        if (currentFullscreenHabitId === habitId) {
            const config = App.getStorage(App.DB_KEYS.CONFIG, []);
            const habit = config.find(h => h.id === habitId);
            updateFullscreenTimer(0, habit?.target || 10);
            updateFullscreenPlayPause(false);
        }
    }

    function addTimerMinutes(habitId, minutes) {
        App.haptic('light');
        const dateStr = App.getDateStr(App.currentDate());
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const currentMins = (data[dateStr]?.[habitId]) || 0;

        // If timer is running, update the base
        if (timerStartTimes[habitId + '_base'] !== undefined) {
            timerStartTimes[habitId + '_base'] += minutes;
        }

        updateEntry(habitId, currentMins + minutes, true);
    }

    // === TIMER FULLSCREEN ===
    function openTimerFullscreen(habitId) {
        App.haptic('medium');
        currentFullscreenHabitId = habitId;

        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const habit = config.find(h => h.id === habitId);
        if (!habit) return;

        const dateStr = App.getDateStr(App.currentDate());
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const currentMins = (data[dateStr]?.[habitId]) || 0;
        const target = habit.target || 10;
        const isRunning = timerIntervals[habitId] !== undefined;
        const colors = getAccentColors(habit.accent);

        document.getElementById('timerFsHabitName').textContent = `${habit.icon} ${habit.title}`;
        document.getElementById('timerFsTarget').textContent = `/ ${target} min`;

        // Apply accent color to ring
        const ringFill = document.getElementById('timerFsRingFill');
        ringFill.style.stroke = colors.dark;

        updateFullscreenTimer(currentMins, target);
        updateFullscreenPlayPause(isRunning);

        document.getElementById('timerFullscreen').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeTimerFullscreen() {
        App.haptic('light');
        document.getElementById('timerFullscreen').classList.remove('show');
        document.body.style.overflow = '';
        currentFullscreenHabitId = null;
    }

    function updateFullscreenTimer(currentMins, target) {
        document.getElementById('timerFsValue').textContent = formatTime(currentMins);

        const percentage = Math.min((currentMins / target) * 100, 100);
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (percentage / 100) * circumference;

        document.getElementById('timerFsRingFill').style.strokeDashoffset = offset;
    }

    function updateFullscreenPlayPause(isRunning) {
        const btn = document.getElementById('timerFsPlayPause');
        const playIcon = btn.querySelector('.play-icon');
        const pauseIcon = btn.querySelector('.pause-icon');

        if (isRunning) {
            btn.classList.add('paused');
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            btn.classList.remove('paused');
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    function toggleTimerFromFullscreen() {
        if (currentFullscreenHabitId) {
            const config = App.getStorage(App.DB_KEYS.CONFIG, []);
            const habit = config.find(h => h.id === currentFullscreenHabitId);
            if (habit) {
                toggleTimer(currentFullscreenHabitId, habit.target || 10);
            }
        }
    }

    function resetTimerFromFullscreen() {
        if (currentFullscreenHabitId) {
            resetTimer(currentFullscreenHabitId);
        }
    }

    function addTimeFromFullscreen(minutes) {
        if (currentFullscreenHabitId) {
            addTimerMinutes(currentFullscreenHabitId, minutes);

            const dateStr = App.getDateStr(App.currentDate());
            const data = App.getStorage(App.DB_KEYS.DATA, {});
            const config = App.getStorage(App.DB_KEYS.CONFIG, []);
            const habit = config.find(h => h.id === currentFullscreenHabitId);
            const currentMins = (data[dateStr]?.[currentFullscreenHabitId]) || 0;

            updateFullscreenTimer(currentMins, habit?.target || 10);
        }
    }

    // === HABIT INTERACTIONS ===
    function toggleCheckbox(habitId) {
        const dateStr = App.getDateStr(App.currentDate());
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const daysData = data[dateStr] || {};
        const newValue = !daysData[habitId];
        updateEntry(habitId, newValue, true);
    }

    function adjustCounter(habitId, delta) {
        const dateStr = App.getDateStr(App.currentDate());
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const daysData = data[dateStr] || {};
        const currentVal = daysData[habitId] || 0;
        const newValue = Math.max(0, currentVal + delta);
        updateEntry(habitId, newValue, true);
    }

    function setStars(habitId, rating) {
        updateEntry(habitId, rating, true);
    }

    function saveText(habitId, text) {
        updateEntry(habitId, text, true);
    }

    function updateCharCount(textarea) {
        const parent = textarea.parentElement;
        const counter = parent.querySelector('.journal-char-count');
        if (counter) {
            counter.textContent = `${textarea.value.length} chars`;
        }
    }

    function updateEntry(habitId, value, withAnimation = false) {
        const dateStr = App.getDateStr(App.currentDate());
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);

        App.pushUndo({
            dateStr,
            habitId,
            oldValue: data[dateStr]?.[habitId],
            newValue: value
        });

        if (!data[dateStr]) data[dateStr] = {};
        data[dateStr][habitId] = value;
        App.setStorage(App.DB_KEYS.DATA, data);

        const habit = config.find(h => h.id === habitId);
        if (habit && withAnimation) {
            const score = calculateHabitScore(habit, value);
            if (score > 0) {
                App.haptic('success');
                App.showToast(`+${score} points!`, true);

                const activeHabits = config.filter(h => h.active !== false);
                const daysData = data[dateStr];
                let allComplete = true;
                activeHabits.forEach(h => {
                    const earned = calculateHabitScore(h, daysData[h.id]);
                    if (earned === 0) allComplete = false;
                });

                if (allComplete) {
                    App.triggerConfetti();
                }
            } else {
                App.haptic('light');
                App.showToast('Saved!', true);
            }
        }

        renderDay();
    }

    // === SETUP LIST ===
    function renderSetupList() {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const activeHabits = config.filter(h => h.active !== false);
        const archivedHabits = config.filter(h => h.active === false);

        const listEl = document.getElementById('setupList');
        listEl.innerHTML = '';

        const typeLabels = {
            checkbox: '☑️ Checkbox',
            counter: '🔢 Counter',
            timer: '⏱️ Timer',
            stars: '⭐ Stars',
            text: '📝 Journal'
        };

        activeHabits.forEach((habit) => {
            const item = document.createElement('div');
            item.className = 'setup-item';
            item.draggable = true;
            item.dataset.id = habit.id;

            item.innerHTML = `
            <div class="setup-drag-handle">⋮⋮</div>
            <div class="setup-item-info">
                <div class="setup-item-icon">${habit.icon}</div>
                <div class="setup-item-details">
                    <div class="setup-item-title">${habit.title}</div>
                    <div class="setup-item-meta">${typeLabels[habit.type] || habit.type} • ${habit.score} pts</div>
                </div>
            </div>
            <div class="setup-item-actions">
                <button class="icon-btn" onclick="Habits.editHabit('${habit.id}')">✏️</button>
                <button class="icon-btn" onclick="Habits.archiveHabit('${habit.id}')">📦</button>
                <button class="icon-btn delete" onclick="Habits.deleteHabit('${habit.id}')">🗑️</button>
            </div>
        `;

            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);

            listEl.appendChild(item);
        });

        // Archived section
        const archivedSection = document.getElementById('archivedSection');
        if (archivedHabits.length > 0) {
            archivedSection.style.display = 'block';

            const archivedList = document.getElementById('archivedList');
            archivedList.innerHTML = '';

            const typeIcons = {
                checkbox: '☑️',
                counter: '🔢',
                timer: '⏱️',
                stars: '⭐',
                text: '📝'
            };

            archivedHabits.forEach(habit => {
                const item = document.createElement('div');
                item.className = 'archived-item';

                item.innerHTML = `
                <div class="archived-item-info">
                    <span>${habit.icon} ${habit.title}</span>
                    <span class="archived-item-type">${typeIcons[habit.type] || ''}</span>
                </div>
                <div class="archived-item-actions">
                    <button class="icon-btn" onclick="Habits.restoreHabit('${habit.id}')">♻️</button>
                    <button class="icon-btn delete" onclick="Habits.deleteHabit('${habit.id}')">🗑️</button>
                </div>
            `;

                archivedList.appendChild(item);
            });
        } else {
            archivedSection.style.display = 'none';
        }
    }

    // === DRAG AND DROP ===
    function handleDragStart(e) {
        draggedItem = this;
        this.style.opacity = '0.4';
        App.haptic('light');
    }

    function handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientY);
        if (afterElement == null) {
            e.currentTarget.parentElement.appendChild(draggedItem);
        } else {
            e.currentTarget.parentElement.insertBefore(draggedItem, afterElement);
        }

        return false;
    }

    function handleDrop(e) {
        if (e.stopPropagation) e.stopPropagation();

        const listEl = document.getElementById('setupList');
        const items = Array.from(listEl.querySelectorAll('.setup-item'));
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);

        const newOrder = items.map(item => item.dataset.id);
        const reorderedConfig = newOrder.map(id => config.find(h => h.id === id)).filter(Boolean);

        const archived = config.filter(h => h.active === false);
        App.setStorage(App.DB_KEYS.CONFIG, [...reorderedConfig, ...archived]);

        App.haptic('medium');
        renderDay();

        return false;
    }

    function handleDragEnd() {
        this.style.opacity = '1';
        draggedItem = null;
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.setup-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function toggleArchivedList() {
        const list = document.getElementById('archivedList');
        const chevron = document.getElementById('archivedChevron');

        if (list.style.display === 'none') {
            list.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
        } else {
            list.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        }

        App.haptic('light');
    }

    // === HABIT CRUD ===
    function editHabit(id) {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const habit = config.find(h => h.id === id);
        if (!habit) return;

        App.haptic('light');
        editingHabitId = id;

        document.getElementById('newHabitTitle').value = habit.title;
        document.getElementById('newHabitScore').value = habit.score;
        document.getElementById('newHabitIcon').value = habit.icon;
        document.getElementById('newHabitType').value = habit.type;
        document.getElementById(`accent-${habit.accent || 'mint'}`).checked = true;

        if (habit.target) {
            document.getElementById('newHabitTarget').value = habit.target;
        }

        updateTypeOptions();

        document.getElementById('addHabitFormTitle').textContent = 'Edit Habit';
        document.getElementById('addHabitBtnText').textContent = 'Update Habit';
        document.getElementById('addHabitBtn').classList.add('editing');

        document.querySelector('.add-habit-form').scrollIntoView({ behavior: 'smooth' });
    }

    function addNewHabit() {
        const title = document.getElementById('newHabitTitle').value.trim();
        if (!title) {
            App.haptic('error');
            App.showToast('Please enter a habit name');
            return;
        }

        const type = document.getElementById('newHabitType').value;
        const score = parseInt(document.getElementById('newHabitScore').value) || 10;
        const icon = document.getElementById('newHabitIcon').value || '✨';
        const accent = document.querySelector('input[name="accentColor"]:checked').value;
        const target = parseInt(document.getElementById('newHabitTarget').value) || 8;

        const config = App.getStorage(App.DB_KEYS.CONFIG, []);

        if (editingHabitId) {
            const habitIndex = config.findIndex(h => h.id === editingHabitId);
            if (habitIndex !== -1) {
                config[habitIndex] = {
                    ...config[habitIndex],
                    title,
                    icon,
                    type,
                    score,
                    accent,
                    target: (type === 'counter' || type === 'timer') ? target : undefined
                };
                App.setStorage(App.DB_KEYS.CONFIG, config);
                App.showToast(`${title} updated!`);
            }
            editingHabitId = null;
        } else {
            const newHabit = {
                id: `h_${Date.now()}`,
                title,
                icon,
                type,
                score,
                accent,
                active: true
            };

            if (type === 'counter' || type === 'timer') {
                newHabit.target = target;
            }

            config.push(newHabit);
            App.setStorage(App.DB_KEYS.CONFIG, config);
            App.showToast(`${title} added!`);
        }

        resetHabitForm();

        App.haptic('success');
        renderSetupList();
        renderDay();
    }

    function resetHabitForm() {
        document.getElementById('newHabitTitle').value = '';
        document.getElementById('newHabitIcon').value = '✨';
        document.getElementById('newHabitType').value = 'checkbox';
        document.getElementById('newHabitScore').value = '10';
        document.getElementById('accent-mint').checked = true;
        updateTypeOptions();

        document.getElementById('addHabitFormTitle').textContent = 'Add New Habit';
        document.getElementById('addHabitBtnText').textContent = 'Create Habit';
        document.getElementById('addHabitBtn').classList.remove('editing');

        editingHabitId = null;
    }

    function archiveHabit(habitId) {
        App.haptic('medium');
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const habit = config.find(h => h.id === habitId);
        if (habit) {
            habit.active = false;
            App.setStorage(App.DB_KEYS.CONFIG, config);
            renderSetupList();
            renderDay();
            App.showToast(`${habit.title} archived`);
        }
    }

    function restoreHabit(habitId) {
        App.haptic('medium');
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const habit = config.find(h => h.id === habitId);
        if (habit) {
            habit.active = true;
            App.setStorage(App.DB_KEYS.CONFIG, config);
            renderSetupList();
            renderDay();
            App.showToast(`${habit.title} restored!`);
        }
    }

    function deleteHabit(habitId) {
        if (!confirm('Are you sure? This will delete all history for this habit.')) return;

        App.haptic('heavy');
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const newConfig = config.filter(h => h.id !== habitId);
        App.setStorage(App.DB_KEYS.CONFIG, newConfig);

        const data = App.getStorage(App.DB_KEYS.DATA, {});
        Object.keys(data).forEach(dateStr => {
            delete data[dateStr][habitId];
        });
        App.setStorage(App.DB_KEYS.DATA, data);

        renderSetupList();
        renderDay();
        App.showToast('Habit deleted');
    }

    function updateTypeOptions() {
        const type = document.getElementById('newHabitType').value;
        const targetGroup = document.getElementById('targetGroup');
        const targetLabel = document.getElementById('targetLabel');
        const targetUnit = document.getElementById('targetUnit');

        if (type === 'counter') {
            targetGroup.style.display = 'block';
            targetLabel.textContent = 'Target';
            targetUnit.textContent = 'times';
        } else if (type === 'timer') {
            targetGroup.style.display = 'block';
            targetLabel.textContent = 'Target';
            targetUnit.textContent = 'minutes';
        } else {
            targetGroup.style.display = 'none';
        }
    }

    function selectEmoji(emoji) {
        document.getElementById('newHabitIcon').value = emoji;
        App.haptic('light');
    }

    // === PUBLIC API ===
    return {
        calculateHabitScore,
        calculateCompletionForPeriod,
        formatTime,
        renderDay,
        toggleTimer,
        resetTimer,
        addTimerMinutes,
        openTimerFullscreen,
        closeTimerFullscreen,
        toggleTimerFromFullscreen,
        resetTimerFromFullscreen,
        addTimeFromFullscreen,
        toggleCheckbox,
        adjustCounter,
        setStars,
        saveText,
        updateCharCount,
        renderSetupList,
        toggleArchivedList,
        editHabit,
        addNewHabit,
        archiveHabit,
        restoreHabit,
        deleteHabit,
        updateTypeOptions,
        selectEmoji
    };})();