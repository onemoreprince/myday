/* ==========================================
   APP.JS - Core Application Logic
   ========================================== */

const App = (function () {
    'use strict';

    // === CONSTANTS ===
    const DB_KEYS = {
        CONFIG: 'myday_config',
        DATA: 'myday_data',
        SETTINGS: 'myday_settings'
    };

    const DEFAULT_HABITS = [
        { id: 'h_1', title: 'Drink Water', icon: '💧', type: 'counter', score: 10, target: 8, accent: 'blue', active: true },
        { id: 'h_2', title: 'Daily Mood', icon: '🧠', type: 'stars', score: 20, accent: 'pink', active: true },
        { id: 'h_3', title: 'Meditation', icon: '🧘', type: 'timer', score: 15, target: 10, accent: 'lavender', active: true },
        { id: 'h_4', title: 'Gratitude Journal', icon: '📓', type: 'text', score: 15, accent: 'peach', active: true }
    ];

    // === STATE ===
    let currentDate = new Date();
    let undoStack = [];
    let deferredPrompt = null;
    let notificationCheckInterval = null;

    // === STORAGE HELPERS ===
    function getStorage(key, defaultVal) {
        try {
            return JSON.parse(localStorage.getItem(key)) || defaultVal;
        } catch {
            return defaultVal;
        }
    }

    function setStorage(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    // === DATE UTILITIES ===
    function getDateStr(date) {
        return date.toISOString().split('T')[0];
    }

    function getPrettyDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }

    // === HAPTIC FEEDBACK ===
    function haptic(type = 'light') {
        // Check if vibration is supported and we're in a secure context
        if (!('vibrate' in navigator) || !window.isSecureContext) {
            return;
        }

        try {
            const patterns = {
                light: 10,
                medium: 25,
                heavy: [30, 10, 30],
                success: [10, 50, 20, 50, 30],
                error: [50, 30, 50]
            };
            navigator.vibrate(patterns[type] || 10);
        } catch (e) {
            // Silently fail if vibration is blocked
            console.log('Vibration not available:', e);
        }
    }

    // === PWA & SERVICE WORKER ===
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => console.log('SW registered:', registration.scope))
                .catch((error) => console.log('SW registration failed:', error));
        }
    }

    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            const settings = getStorage(DB_KEYS.SETTINGS, {});
            if (!settings.installDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
                setTimeout(() => showInstallPrompt(), 3000);
            }
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            hideInstallPrompt();
            showToast('App installed! 🎉');
        });
    }

    function showInstallPrompt() {
        if (deferredPrompt) {
            document.getElementById('installPrompt').classList.add('show');
        }
    }

    function hideInstallPrompt() {
        document.getElementById('installPrompt').classList.remove('show');
    }

    async function installApp() {
        if (!deferredPrompt) return;

        haptic('medium');
        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast('Installing MyDay...');
        }

        deferredPrompt = null;
        hideInstallPrompt();
    }

    function dismissInstall() {
        haptic('light');
        hideInstallPrompt();

        const settings = getStorage(DB_KEYS.SETTINGS, {});
        settings.installDismissed = true;
        setStorage(DB_KEYS.SETTINGS, settings);
    }

    // === MODAL MANAGEMENT ===
    function openModal(modalId) {
        haptic('light');
        const modal = document.getElementById(modalId);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.classList.add('show'), 10);

        if (modalId === 'setupModal') {
            Habits.renderSetupList();
        }

        if (modalId === 'reportsModal') {
            Reports.renderReports();
        }
    }

    function closeModal(modalId) {
        haptic('light');
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    // === DATE NAVIGATION ===
    function changeDate(delta) {
        haptic('light');
        currentDate.setDate(currentDate.getDate() + delta);
        Habits.renderDay();
    }

    function goToToday() {
        haptic('light');
        currentDate = new Date();
        Habits.renderDay();
    }


    // === DATE PICKER ===
    function openDatePicker() {
        haptic('light');
        // Set the input to the current viewing date
        const dateInput = document.getElementById('jumpToDateInput');
        dateInput.value = getDateStr(currentDate);

        // Trigger the native date picker directly (no modal)
        dateInput.showPicker ? dateInput.showPicker() : dateInput.focus();
    }

    function jumpToSelectedDate() {
        const dateInput = document.getElementById('jumpToDateInput');
        if (dateInput.value) {
            haptic('medium');
            // Parse the date string and create a new date at noon to avoid timezone issues
            const [year, month, day] = dateInput.value.split('-').map(Number);
            currentDate = new Date(year, month - 1, day, 12, 0, 0);
            Habits.renderDay();

            // Show feedback
            const today = new Date();
            const todayStr = getDateStr(today);
            const selectedStr = getDateStr(currentDate);

            if (selectedStr === todayStr) {
                showToast('Jumped to today! 📅');
            } else if (currentDate < today) {
                showToast('Viewing past date 🕐');
            } else {
                showToast('Viewing future date 🔮');
            }
        }
    }


    // === DARK MODE ===
    function toggleDarkMode() {
        haptic('medium');
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        const settings = getStorage(DB_KEYS.SETTINGS, {});
        settings.darkMode = !isDark;
        setStorage(DB_KEYS.SETTINGS, settings);
    }

    // === NOTIFICATIONS ===
    async function toggleNotifications() {
        const toggle = document.getElementById('notificationToggle');
        const timeInput = document.getElementById('notificationTime');

        if (toggle.checked) {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    haptic('success');
                    timeInput.style.display = 'flex';

                    const settings = getStorage(DB_KEYS.SETTINGS, {});
                    settings.notifications = true;
                    setStorage(DB_KEYS.SETTINGS, settings);

                    startNotificationChecker();
                    showToast('Reminders enabled! 🔔');
                } else {
                    toggle.checked = false;
                    haptic('error');
                    showToast('Notification permission denied');
                }
            } else {
                toggle.checked = false;
                showToast('Notifications not supported');
            }
        } else {
            timeInput.style.display = 'none';

            const settings = getStorage(DB_KEYS.SETTINGS, {});
            settings.notifications = false;
            setStorage(DB_KEYS.SETTINGS, settings);

            stopNotificationChecker();
        }
    }

    function saveReminderTime() {
        haptic('light');
        const time = document.getElementById('reminderTime').value;
        const settings = getStorage(DB_KEYS.SETTINGS, {});
        settings.reminderTime = time;
        setStorage(DB_KEYS.SETTINGS, settings);
        showToast('Reminder time saved!');

        startNotificationChecker();
    }

    function startNotificationChecker() {
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
        }

        const settings = getStorage(DB_KEYS.SETTINGS, {});
        if (!settings.notifications || !settings.reminderTime) return;

        notificationCheckInterval = setInterval(() => {
            const settings = getStorage(DB_KEYS.SETTINGS, {});
            if (!settings.notifications || !settings.reminderTime) {
                stopNotificationChecker();
                return;
            }

            const now = new Date();
            const [targetHours, targetMinutes] = settings.reminderTime.split(':').map(Number);

            if (now.getHours() === targetHours && now.getMinutes() === targetMinutes) {
                sendNotification();
            }
        }, 30000);
    }

    function stopNotificationChecker() {
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
            notificationCheckInterval = null;
        }
    }

    function sendNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('MyDay Reminder 🌸', {
                body: "Time to check in on your habits!",
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌸</text></svg>',
                vibrate: [100, 50, 100],
                requireInteraction: false
            });

            setTimeout(() => notification.close(), 10000);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    // === TOAST ===
    function showToast(msg = 'Saved!', showUndo = false) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMessage');
        const toastUndo = document.getElementById('toastUndo');

        toastMsg.textContent = `✨ ${msg}`;
        toastUndo.style.display = showUndo && undoStack.length > 0 ? 'block' : 'none';

        toast.classList.add('show');

        clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, showUndo ? 5000 : 2000);
    }


    // === CONFETTI ===
    function triggerConfetti() {
        haptic('success');

        const canvas = document.getElementById('confettiCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = [
            '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff85a2',
            '#a855f7', '#38bdf8', '#fb923c', '#2dd4bf', '#f472b6'
        ];
        const shapes = ['rect', 'circle', 'triangle', 'star'];

        // Create particles from multiple burst points
        const burstPoints = [
            { x: canvas.width * 0.25, y: canvas.height * 0.6 },
            { x: canvas.width * 0.5, y: canvas.height * 0.5 },
            { x: canvas.width * 0.75, y: canvas.height * 0.6 }
        ];

        burstPoints.forEach(point => {
            for (let i = 0; i < 50; i++) {
                const angle = (Math.random() * Math.PI * 2);
                const velocity = Math.random() * 12 + 6;

                particles.push({
                    x: point.x,
                    y: point.y,
                    vx: Math.cos(angle) * velocity * (Math.random() * 0.5 + 0.5),
                    vy: Math.sin(angle) * velocity - Math.random() * 8 - 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 10 + 5,
                    shape: shapes[Math.floor(Math.random() * shapes.length)],
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 15,
                    gravity: 0.25 + Math.random() * 0.1,
                    drag: 0.98 + Math.random() * 0.015,
                    opacity: 1,
                    wobble: Math.random() * 10,
                    wobbleSpeed: Math.random() * 0.1 + 0.05
                });
            }
        });

        let frame = 0;
        const maxFrames = 180;

        function drawShape(p) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;

            switch (p.shape) {
                case 'rect':
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                    break;
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size / 2);
                    ctx.lineTo(p.size / 2, p.size / 2);
                    ctx.lineTo(-p.size / 2, p.size / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'star':
                    drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
                    break;
            }
            ctx.restore();
        }

        function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
            let rot = Math.PI / 2 * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);

            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }

            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
            ctx.fill();
        }

        function animate() {
            if (frame >= maxFrames) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                // Apply physics
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;

                // Add wobble effect
                p.x += p.vx + Math.sin(frame * p.wobbleSpeed) * p.wobble * 0.1;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;

                // Fade out towards the end
                if (frame > maxFrames * 0.6) {
                    p.opacity = Math.max(0, 1 - (frame - maxFrames * 0.6) / (maxFrames * 0.4));
                }

                drawShape(p);
            });

            frame++;
            requestAnimationFrame(animate);
        }

        animate();
    }


    // === SHARE PROGRESS ===
    function shareProgress() {
        haptic('medium');

        const currentDateObj = currentDate;
        const dateStr = getDateStr(currentDateObj);
        const config = getStorage(DB_KEYS.CONFIG, []);
        const activeHabits = config.filter(h => h.active !== false);
        const data = getStorage(DB_KEYS.DATA, {});
        const daysData = data[dateStr] || {};

        // Calculate scores
        let totalScore = 0;
        let maxScore = 0;
        let completedCount = 0;
        const habitDetails = [];

        activeHabits.forEach(habit => {
            const val = daysData[habit.id];
            const habitMaxScore = parseInt(habit.score) || 0;
            const earned = Habits.calculateHabitScore(habit, val);

            maxScore += habitMaxScore;
            totalScore += earned;

            const isComplete = earned > 0;
            if (isComplete) completedCount++;

            habitDetails.push({
                icon: habit.icon,
                title: habit.title,
                isComplete,
                earned,
                max: habitMaxScore
            });
        });

        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        // Format date
        const dateFormatted = currentDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });

        // Build WhatsApp-friendly message with formatting
        let message = `*🌟 MyDay Progress Report*\n`;
        message += `📅 _${dateFormatted}_\n\n`;

        // Score summary with visual bar
        const filledBlocks = Math.round(percentage / 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = '🟩'.repeat(filledBlocks) + '⬜'.repeat(emptyBlocks);

        message += `${progressBar}\n`;
        message += `*${totalScore}/${maxScore} points* (${percentage}%)\n\n`;

        // Habits breakdown
        message += `*Habits:* ${completedCount}/${activeHabits.length} completed\n`;
        message += `━━━━━━━━━━━━━━━\n`;

        habitDetails.forEach(h => {
            const statusEmoji = h.isComplete ? '🟢' : '🔴';
            const pointsText = h.isComplete ? `+${h.earned}` : '0';
            message += `${statusEmoji} ${h.icon} ${h.title} _(${pointsText}/${h.max})_\n`;
        });

        message += `━━━━━━━━━━━━━━━\n\n`;

        // Motivational footer based on percentage
        if (percentage === 100) {
            message += `🏆 *All habits completed today!*`;
        } else if (percentage >= 80) {
            message += `✨ *Almost a perfect day!*`;
        } else if (percentage >= 50) {
            message += `📊 *More than halfway there!*`;
        } else if (percentage > 0) {
            message += `🚀 *Day in progress...*`;
        } else {
            message += `📋 *Day just started*`;
        }

        // Use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'MyDay Progress',
                text: message
            }).then(() => {
                showToast('Shared successfully! 📤');
            }).catch((err) => {
                if (err.name !== 'AbortError') {
                    fallbackCopyShare(message);
                }
            });
        } else {
            fallbackCopyShare(message);
        }
    }

    function fallbackCopyShare(message) {
        // Fallback: copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message).then(() => {
                showToast('Copied to clipboard! 📋');
            }).catch(() => {
                showToast('Could not share');
            });
        } else {
            // Final fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = message;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast('Copied to clipboard! 📋');
            } catch (err) {
                showToast('Could not share');
            }
            document.body.removeChild(textArea);
        }
    }

    // === UNDO ===
    function undoLastAction() {
        if (undoStack.length === 0) return;

        haptic('medium');
        const action = undoStack.pop();
        const data = getStorage(DB_KEYS.DATA, {});

        if (action.oldValue === undefined) {
            delete data[action.dateStr][action.habitId];
        } else {
            if (!data[action.dateStr]) data[action.dateStr] = {};
            data[action.dateStr][action.habitId] = action.oldValue;
        }

        setStorage(DB_KEYS.DATA, data);
        Habits.renderDay();
    }

    // === INITIALIZATION ===
    function init() {
        registerServiceWorker();
        setupInstallPrompt();

        const settings = getStorage(DB_KEYS.SETTINGS, {});
        if (settings.darkMode ||
            (!settings.hasOwnProperty('darkMode') &&
                window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        if (settings.notifications) {
            document.getElementById('notificationToggle').checked = true;
            document.getElementById('notificationTime').style.display = 'flex';
            if (settings.reminderTime) {
                document.getElementById('reminderTime').value = settings.reminderTime;
            }
        }

        // Initialize config if not exists
        if (!localStorage.getItem(DB_KEYS.CONFIG)) {
            setStorage(DB_KEYS.CONFIG, DEFAULT_HABITS);
        }

        Habits.renderDay();
        startNotificationChecker();

        // Handle URL actions
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        if (action === 'add') {
            setTimeout(() => openModal('setupModal'), 500);
        } else if (action === 'reports') {
            setTimeout(() => openModal('reportsModal'), 500);
        }

        // Undo button handler
        document.getElementById('toastUndo').addEventListener('click', () => {
            undoLastAction();
            document.getElementById('toast').classList.remove('show');
        });
    }

    // === PUBLIC API ===
    return {
        DB_KEYS,
        currentDate: () => currentDate,
        setCurrentDate: (date) => { currentDate = date; },
        getStorage,
        setStorage,
        getDateStr,
        getPrettyDate,
        haptic,
        showToast,
        triggerConfetti,
        openModal,
        closeModal,
        changeDate,
        goToToday,
        openDatePicker,
        jumpToSelectedDate,
        toggleDarkMode,
        toggleNotifications,
        saveReminderTime,
        installApp,
        dismissInstall,
        undoLastAction,
        shareProgress,
        pushUndo: (action) => {
            undoStack.push(action);
            if (undoStack.length > 10) undoStack.shift();
        },
        init
    };

})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', App.init);