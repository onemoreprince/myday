/* ==========================================
   REPORTS.JS - Reports, Stats & Data Management
   ========================================== */

const Reports = (function () {
    'use strict';

    let currentReportMonth = new Date();
    let currentView = 'month';

    // === RENDER REPORTS ===
    function renderReports() {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const data = App.getStorage(App.DB_KEYS.DATA, {});

        // Calculate total points
        let totalPoints = 0;
        Object.keys(data).forEach(dateStr => {
            const daysData = data[dateStr];
            config.forEach(habit => {
                const val = daysData[habit.id];
                totalPoints += Habits.calculateHabitScore(habit, val);
            });
        });

        document.getElementById('totalPoints').textContent = totalPoints;

        // Set default custom date range
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        document.getElementById('customStartDate').value = App.getDateStr(weekAgo);
        document.getElementById('customEndDate').value = App.getDateStr(today);

        // Render current view
        setReportView(currentView);
    }

    // === VIEW TOGGLE ===
    function setReportView(view) {
        App.haptic('light');
        currentView = view;

        document.getElementById('viewMonth').classList.toggle('active', view === 'month');
        document.getElementById('viewWeek').classList.toggle('active', view === 'week');
        document.getElementById('viewCustom').classList.toggle('active', view === 'custom');

        document.getElementById('monthReport').style.display = view === 'month' ? 'block' : 'none';
        document.getElementById('weeklyReport').style.display = view === 'week' ? 'block' : 'none';
        document.getElementById('customReport').style.display = view === 'custom' ? 'block' : 'none';

        if (view === 'month') {
            renderMonthReport();
        } else if (view === 'week') {
            renderWeeklyReport();
        } else if (view === 'custom') {
            updateCustomReport();
        }

        updatePeriodCompletion(view);
        renderHabitCompletion(view);
    }

    // === MONTH NAVIGATION ===
    function changeMonth(delta) {
        App.haptic('light');
        currentReportMonth.setMonth(currentReportMonth.getMonth() + delta);
        renderMonthReport();
        updatePeriodCompletion('month');
        renderHabitCompletion('month');
    }

    // === MONTH REPORT ===
    function renderMonthReport() {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const data = App.getStorage(App.DB_KEYS.DATA, {});

        // Update month title
        const monthTitle = currentReportMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('currentMonthTitle').textContent = monthTitle;

        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        const year = currentReportMonth.getFullYear();
        const month = currentReportMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();
        const todayStr = App.getDateStr(today);

        // Add empty cells for days before first of month
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day empty';
            grid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const d = new Date(year, month, day);
            const dStr = App.getDateStr(d);
            const daysData = data[dStr] || {};

            let totalScore = 0;
            let maxScore = 0;

            config.filter(h => h.active !== false).forEach(habit => {
                const score = Habits.calculateHabitScore(habit, daysData[habit.id]);
                totalScore += score;
                maxScore += parseInt(habit.score) || 0;
            });

            const percentage = maxScore > 0 ? totalScore / maxScore : 0;

            const cell = document.createElement('div');
            cell.className = 'cal-day';
            cell.textContent = day;
            cell.title = `${App.getPrettyDate(d)}: ${totalScore} pts`;

            if (dStr === todayStr) {
                cell.classList.add('today');
            }

            if (totalScore > 0) {
                cell.classList.add('has-data');
                if (percentage < 0.3) cell.classList.add('level-1');
                else if (percentage < 0.6) cell.classList.add('level-2');
                else if (percentage < 0.9) cell.classList.add('level-3');
                else cell.classList.add('level-4');
            }

            grid.appendChild(cell);
        }
    }

    // === WEEKLY REPORT ===
    function renderWeeklyReport() {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const chart = document.getElementById('weeklyChart');
        const stats = document.getElementById('weeklyStats');

        chart.innerHTML = '';

        const today = new Date();
        const weekData = [];
        let totalWeek = 0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dStr = App.getDateStr(d);
            const daysData = data[dStr] || {};

            let dayScore = 0;
            config.filter(h => h.active !== false).forEach(habit => {
                dayScore += Habits.calculateHabitScore(habit, daysData[habit.id]);
            });

            totalWeek += dayScore;
            weekData.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                score: dayScore
            });
        }

        const maxScore = Math.max(...weekData.map(d => d.score), 1);

        weekData.forEach(day => {
            const bar = document.createElement('div');
            bar.className = 'weekly-bar';

            const height = (day.score / maxScore) * 80;

            bar.innerHTML = `
                <div class="bar-fill" style="height: ${height}px"></div>
                <div class="bar-label">${day.day}</div>
            `;

            chart.appendChild(bar);
        });

        const avgWeek = Math.round(totalWeek / 7);
        const bestDay = weekData.reduce((a, b) => a.score > b.score ? a : b);

        stats.innerHTML = `
            <div class="weekly-stat">
                <div class="weekly-stat-val">${totalWeek}</div>
                <div class="weekly-stat-lbl">Total Points</div>
            </div>
            <div class="weekly-stat">
                <div class="weekly-stat-val">${avgWeek}</div>
                <div class="weekly-stat-lbl">Daily Avg</div>
            </div>
            <div class="weekly-stat">
                <div class="weekly-stat-val">${bestDay.day}</div>
                <div class="weekly-stat-lbl">Best Day</div>
            </div>
        `;
    }

    // === CUSTOM REPORT ===
    function updateCustomReport() {
        const startDateStr = document.getElementById('customStartDate').value;
        const endDateStr = document.getElementById('customEndDate').value;

        if (!startDateStr || !endDateStr) return;

        const startDate = new Date(startDateStr + 'T00:00:00');
        const endDate = new Date(endDateStr + 'T23:59:59');

        if (startDate > endDate) {
            document.getElementById('customReportContent').innerHTML = `
                <div class="custom-report-summary">
                    <p style="color: var(--text-light);">Start date must be before end date</p>
                </div>
            `;
            return;
        }

        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const data = App.getStorage(App.DB_KEYS.DATA, {});

        let totalPoints = 0;
        let daysWithActivity = 0;
        let totalDays = 0;

        const current = new Date(startDate);
        while (current <= endDate) {
            const dStr = App.getDateStr(current);
            const daysData = data[dStr] || {};
            totalDays++;

            let dayScore = 0;
            config.filter(h => h.active !== false).forEach(habit => {
                dayScore += Habits.calculateHabitScore(habit, daysData[habit.id]);
            });

            totalPoints += dayScore;
            if (dayScore > 0) daysWithActivity++;

            current.setDate(current.getDate() + 1);
        }

        const avgPerDay = totalDays > 0 ? Math.round(totalPoints / totalDays) : 0;

        document.getElementById('customReportContent').innerHTML = `
            <div class="custom-report-summary">
                <div class="big-stat">${totalPoints}</div>
                <div class="stat-label">Total Points</div>
                <div class="stat-row">
                    <div class="stat-item">
                        <div class="val">${totalDays}</div>
                        <div class="lbl">Days</div>
                    </div>
                    <div class="stat-item">
                        <div class="val">${daysWithActivity}</div>
                        <div class="lbl">Active Days</div>
                    </div>
                    <div class="stat-item">
                        <div class="val">${avgPerDay}</div>
                        <div class="lbl">Avg/Day</div>
                    </div>
                </div>
            </div>
        `;

        renderHabitCompletion('custom');
    }

    // === PERIOD COMPLETION ===
    function updatePeriodCompletion(view) {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const data = App.getStorage(App.DB_KEYS.DATA, {});
        const activeHabits = config.filter(h => h.active !== false);

        let startDate, endDate;

        if (view === 'month') {
            startDate = new Date(currentReportMonth.getFullYear(), currentReportMonth.getMonth(), 1);
            endDate = new Date(currentReportMonth.getFullYear(), currentReportMonth.getMonth() + 1, 0);
        } else if (view === 'week') {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
        } else {
            const startStr = document.getElementById('customStartDate').value;
            const endStr = document.getElementById('customEndDate').value;
            if (!startStr || !endStr) return;
            startDate = new Date(startStr + 'T00:00:00');
            endDate = new Date(endStr + 'T23:59:59');
        }
        let completedTotal = 0;
        let possibleTotal = 0;

        const current = new Date(startDate);
        while (current <= endDate) {
            const dStr = App.getDateStr(current);
            const daysData = data[dStr] || {};

            activeHabits.forEach(habit => {
                possibleTotal++;
                const score = Habits.calculateHabitScore(habit, daysData[habit.id]);
                if (score > 0) completedTotal++;
            });

            current.setDate(current.getDate() + 1);
        }

        document.getElementById('periodCompletion').textContent = `${completedTotal}/${possibleTotal}`;
    }

    // === HABIT COMPLETION ===
    function renderHabitCompletion(view) {
        const config = App.getStorage(App.DB_KEYS.CONFIG, []);
        const activeHabits = config.filter(h => h.active !== false);

        let startDate, endDate;

        if (view === 'month') {
            startDate = new Date(currentReportMonth.getFullYear(), currentReportMonth.getMonth(), 1);
            endDate = new Date(currentReportMonth.getFullYear(), currentReportMonth.getMonth() + 1, 0);
        } else if (view === 'week') {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
        } else {
            const startStr = document.getElementById('customStartDate').value;
            const endStr = document.getElementById('customEndDate').value;
            if (!startStr || !endStr) return;
            startDate = new Date(startStr + 'T00:00:00');
            endDate = new Date(endStr + 'T23:59:59');
        }

        const list = document.getElementById('habitCompletionList');

        const completions = activeHabits.map(habit => {
            const result = Habits.calculateCompletionForPeriod(habit.id, startDate, endDate, config);
            return {
                ...habit,
                completed: result.completed,
                total: result.total,
                percentage: result.total > 0 ? (result.completed / result.total) * 100 : 0
            };
        }).sort((a, b) => b.percentage - a.percentage);

        list.innerHTML = completions.map(h => `
        <div class="completion-item">
            <div class="completion-info">
                <span class="completion-icon">${h.icon}</span>
                <span class="completion-name">${h.title}</span>
            </div>
            <div class="completion-value">
                <div class="completion-bar">
                    <div class="completion-bar-fill" style="width: ${h.percentage}%"></div>
                </div>
                ${h.completed}/${h.total}
            </div>
        </div>
    `).join('');
    }

// === DATA EXPORT (CSV) ===
function exportData() {
    App.haptic('medium');
    const config = App.getStorage(App.DB_KEYS.CONFIG, []);
    const data = App.getStorage(App.DB_KEYS.DATA, {});
    const settings = App.getStorage(App.DB_KEYS.SETTINGS, {});

    // Create CSV content
    let csvContent = '';

    // Section 1: Metadata
    csvContent += '##MYDAY_BACKUP_V2##\n';
    csvContent += '##EXPORT_DATE##,' + new Date().toISOString() + '\n';
    csvContent += '\n';

    // Section 2: Settings
    csvContent += '##SETTINGS##\n';
    csvContent += 'key,value\n';
    Object.keys(settings).forEach(key => {
        const value = String(settings[key]).replace(/,/g, '{{COMMA}}').replace(/\n/g, '{{NEWLINE}}');
        csvContent += `${key},${value}\n`;
    });
    csvContent += '\n';

    // Section 3: Habits Config
    csvContent += '##HABITS##\n';
    csvContent += 'id,title,icon,type,score,target,accent,active\n';
    config.forEach(habit => {
        const title = habit.title.replace(/,/g, '{{COMMA}}').replace(/\n/g, '{{NEWLINE}}');
        const icon = habit.icon.replace(/,/g, '{{COMMA}}');
        csvContent += `${habit.id},${title},${icon},${habit.type},${habit.score || 10},${habit.target || ''},${habit.accent || 'mint'},${habit.active !== false}\n`;
    });
    csvContent += '\n';

    // Section 4: History Data
    csvContent += '##HISTORY##\n';
    csvContent += 'date,habitId,value\n';
    Object.keys(data).forEach(dateStr => {
        const dayData = data[dateStr];
        Object.keys(dayData).forEach(habitId => {
            let value = dayData[habitId];
            // Handle different value types
            if (typeof value === 'string') {
                value = value.replace(/,/g, '{{COMMA}}').replace(/\n/g, '{{NEWLINE}}').replace(/\r/g, '');
            } else if (typeof value === 'boolean') {
                value = value ? 'true' : 'false';
            }
            csvContent += `${dateStr},${habitId},${value}\n`;
        });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `myday_backup_${App.getDateStr(new Date())}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    App.showToast('Backup downloaded! 💾');
}

// === DATA IMPORT (CSV) ===
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const lines = content.split('\n');

            // Verify it's a valid backup
            if (!lines[0].includes('##MYDAY_BACKUP')) {
                throw new Error('Invalid backup file');
            }

            let currentSection = '';
            const settings = {};
            const config = [];
            const data = {};

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip empty lines and header row detection
                if (!line) continue;

                // Detect section headers
                if (line.startsWith('##SETTINGS##')) {
                    currentSection = 'settings';
                    i++; // Skip CSV header row
                    continue;
                } else if (line.startsWith('##HABITS##')) {
                    currentSection = 'habits';
                    i++; // Skip CSV header row
                    continue;
                } else if (line.startsWith('##HISTORY##')) {
                    currentSection = 'history';
                    i++; // Skip CSV header row
                    continue;
                } else if (line.startsWith('##')) {
                    continue; // Skip other metadata lines
                }

                // Parse based on current section
                if (currentSection === 'settings') {
                    const [key, ...valueParts] = line.split(',');
                    if (key) {
                        let value = valueParts.join(',')
                            .replace(/\{\{COMMA\}\}/g, ',')
                            .replace(/\{\{NEWLINE\}\}/g, '\n');
                        // Convert string booleans
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        settings[key] = value;
                    }
                } else if (currentSection === 'habits') {
                    const parts = parseCSVLine(line);
                    if (parts.length >= 7) {
                        const habit = {
                            id: parts[0],
                            title: parts[1].replace(/\{\{COMMA\}\}/g, ',').replace(/\{\{NEWLINE\}\}/g, '\n'),
                            icon: parts[2].replace(/\{\{COMMA\}\}/g, ','),
                            type: parts[3],
                            score: parseInt(parts[4]) || 10,
                            accent: parts[6] || 'mint',
                            active: parts[7] !== 'false'
                        };
                        if (parts[5]) {
                            habit.target = parseInt(parts[5]);
                        }
                        config.push(habit);
                    }
                } else if (currentSection === 'history') {
                    const parts = parseCSVLine(line);
                    if (parts.length >= 3) {
                        const dateStr = parts[0];
                        const habitId = parts[1];
                        let value = parts.slice(2).join(',')
                            .replace(/\{\{COMMA\}\}/g, ',')
                            .replace(/\{\{NEWLINE\}\}/g, '\n');

                        // Convert value types
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        else if (!isNaN(value) && value !== '') value = parseFloat(value);

                        if (!data[dateStr]) data[dateStr] = {};
                        data[dateStr][habitId] = value;
                    }
                }
            }

            // Save imported data
            if (config.length > 0) {
                App.setStorage(App.DB_KEYS.CONFIG, config);
            }
            if (Object.keys(data).length > 0) {
                App.setStorage(App.DB_KEYS.DATA, data);
            }
            if (Object.keys(settings).length > 0) {
                App.setStorage(App.DB_KEYS.SETTINGS, settings);
            }

            Habits.renderDay();
            renderReports();
            App.haptic('success');
            App.showToast('Data imported successfully! 🎉');

        } catch (err) {
            console.error('Import error:', err);
            App.haptic('error');
            App.showToast('Invalid backup file');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Helper function to parse CSV line (handles values with commas)
function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);

    return parts;
}

    // === PUBLIC API ===
    return {
        renderReports,
        setReportView,
        changeMonth,
        updateCustomReport,
        exportData,
        importData
    };
})();