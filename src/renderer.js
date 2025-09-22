const { ipcRenderer } = require('electron');

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusElement = document.getElementById('status');

let countdown;
let isRunning = false;

function formatTime(minutes, seconds) {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    let timeLeft = 20 * 60; // 20 minutes in seconds
    
    statusElement.textContent = 'Timer running';
    ipcRenderer.send('start-timer');

    countdown = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        timerDisplay.textContent = formatTime(minutes, seconds);

        if (timeLeft <= 0) {
            clearInterval(countdown);
            isRunning = false;
            timerDisplay.textContent = '20:00';
            statusElement.textContent = 'Time for a break!';
            // Reset timer after break
            setTimeout(() => {
                startTimer();
            }, 20000); // 20 seconds break
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(countdown);
    isRunning = false;
    timerDisplay.textContent = '20:00';
    statusElement.textContent = 'Timer stopped';
    ipcRenderer.send('stop-timer');
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
