class PomodoroApp {
    constructor() {
        this.timer = null;
        this.isRunning = false;
        this.isBreak = false;
        this.isLongBreak = false;
        this.sessionCount = 0;
        this.currentTime = 25 * 60; // 25 minutes in seconds
        this.breakTime = 5 * 60; // 5 minutes in seconds
        this.longBreakTime = 15 * 60; // 15 minutes in seconds
        this.currentTask = null;
        this.tasks = this.loadTasks();
        this.sessions = this.loadSessions();
        
        this.initializeElements();
        this.attachEventListeners();
        this.updateDisplay();
        this.updateTaskList();
        this.updateHistory();
    }

    initializeElements() {
        this.timerElement = document.getElementById('timer');
        this.timerLabelElement = document.getElementById('timer-label');
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.sessionCountElement = document.getElementById('session-count');
        this.taskInput = document.getElementById('task-input');
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.taskSelect = document.getElementById('task-select');
        this.breakOption = document.getElementById('break-option');
        this.longBreakBtn = document.getElementById('long-break-btn');
        this.skipBreakBtn = document.getElementById('skip-break-btn');
        this.historyList = document.getElementById('history-list');
        this.chime = document.getElementById('chime');
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        this.taskSelect.addEventListener('change', (e) => {
            this.currentTask = e.target.value;
        });
        this.longBreakBtn.addEventListener('click', () => this.startLongBreak());
        this.skipBreakBtn.addEventListener('click', () => this.skipBreak());

        // Handle visibility change to maintain timer accuracy
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.lastActiveTime = Date.now();
            } else if (!document.hidden && this.isRunning) {
                this.adjustTimerForBackground();
            }
        });
    }

    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.lastActiveTime = Date.now();
            
            this.timer = setInterval(() => {
                this.updateTimer();
            }, 1000);
        }
    }

    stopTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            clearInterval(this.timer);
        }
    }

    resetTimer() {
        this.stopTimer();
        this.isBreak = false;
        this.isLongBreak = false;
        this.currentTime = 25 * 60;
        this.updateDisplay();
        this.hideBreakOption();
    }

    updateTimer() {
        if (this.currentTime > 0) {
            this.currentTime--;
            this.updateDisplay();
        } else {
            this.completeSession();
        }
    }

    completeSession() {
        this.stopTimer();
        this.playChime();
        
        if (!this.isBreak && !this.isLongBreak) {
            // Completed a focus session
            this.sessionCount++;
            this.saveSession();
            this.updateSessionCount();
            
            if (this.sessionCount % 4 === 0) {
                this.showBreakOption();
            } else {
                this.startBreak();
            }
        } else {
            // Completed a break
            this.isBreak = false;
            this.isLongBreak = false;
            this.currentTime = 25 * 60;
            this.updateDisplay();
            this.hideBreakOption();
        }
    }

    startBreak() {
        this.isBreak = true;
        this.currentTime = this.breakTime;
        this.timerLabelElement.textContent = 'Break Time';
        this.updateDisplay();
        this.startTimer();
    }

    startLongBreak() {
        this.hideBreakOption();
        this.isLongBreak = true;
        this.currentTime = this.longBreakTime;
        this.timerLabelElement.textContent = 'Long Break';
        this.updateDisplay();
        this.startTimer();
    }

    skipBreak() {
        this.hideBreakOption();
        this.isBreak = false;
        this.isLongBreak = false;
        this.currentTime = 25 * 60;
        this.timerLabelElement.textContent = '';
        this.updateDisplay();
    }

    showBreakOption() {
        this.breakOption.classList.remove('hidden');
    }

    hideBreakOption() {
        this.breakOption.classList.add('hidden');
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (!this.isBreak && !this.isLongBreak) {
            this.timerLabelElement.textContent = '';
        }
    }

    updateSessionCount() {
        this.sessionCountElement.textContent = this.sessionCount;
    }

    addTask() {
        const taskName = this.taskInput.value.trim();
        if (taskName && !this.tasks.includes(taskName)) {
            this.tasks.push(taskName);
            this.saveTasks();
            this.updateTaskList();
            this.taskInput.value = '';
        }
    }

    updateTaskList() {
        this.taskSelect.innerHTML = '<option value="">Choose a task...</option>';
        this.tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task;
            option.textContent = task;
            this.taskSelect.appendChild(option);
        });
    }

    saveSession() {
        if (this.currentTask) {
            const session = {
                task: this.currentTask,
                date: new Date().toISOString().split('T')[0],
                duration: 25 // 25 minutes
            };
            this.sessions.push(session);
            this.saveSessions();
            this.updateHistory();
        }
    }

    updateHistory() {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        
        const recentSessions = this.sessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate >= fiveDaysAgo;
        });

        if (recentSessions.length === 0) {
            this.historyList.innerHTML = '<p class="no-history">No tasks completed yet. Start your first Pomodoro session!</p>';
            return;
        }

        // Group sessions by task and calculate total time
        const taskTotals = {};
        recentSessions.forEach(session => {
            if (taskTotals[session.task]) {
                taskTotals[session.task] += session.duration;
            } else {
                taskTotals[session.task] = session.duration;
            }
        });

        // Sort by total time (descending)
        const sortedTasks = Object.entries(taskTotals)
            .sort(([,a], [,b]) => b - a);

        this.historyList.innerHTML = sortedTasks.map(([task, totalMinutes]) => {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            return `
                <div class="history-item">
                    <span class="task-name">${task}</span>
                    <span class="task-time">${timeDisplay}</span>
                </div>
            `;
        }).join('');
    }

    playChime() {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    adjustTimerForBackground() {
        if (this.isRunning && this.lastActiveTime) {
            const timeInBackground = Math.floor((Date.now() - this.lastActiveTime) / 1000);
            this.currentTime = Math.max(0, this.currentTime - timeInBackground);
            
            if (this.currentTime <= 0) {
                this.completeSession();
            } else {
                this.updateDisplay();
            }
        }
    }

    // Local Storage Methods
    saveTasks() {
        localStorage.setItem('pomodoro-tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const saved = localStorage.getItem('pomodoro-tasks');
        return saved ? JSON.parse(saved) : [];
    }

    saveSessions() {
        localStorage.setItem('pomodoro-sessions', JSON.stringify(this.sessions));
    }

    loadSessions() {
        const saved = localStorage.getItem('pomodoro-sessions');
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroApp();
});
