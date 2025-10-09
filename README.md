# 20-20-20 Break

An Electron application that helps reduce eye strain by reminding you to follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.

## Features

- Multi-screen Support: Displays reminders across all connected screens for comprehensive coverage
- Screen Blocking: Actively blocks screens during break time to ensure you take proper breaks
- Relaxing Sound Options:
  - "Humming" meditation sound
  - "Sound Healing" background audio
- Flexible Timer Control:
  - Pause functionality for planned meetings
  - Emergency skip button when breaks aren't possible
- Timer that counts down from 20 minutes
- Desktop notifications when it's time to take a break
- Simple and clean user interface
- Automatic timer reset after breaks

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

## Running the Application

To start the application, run:
```bash
npm start
```

## How it Works

The app runs a timer for 20 minutes. When the timer completes, it activates break mode across all your connected displays:

1. All screens display the break reminder
2. Screens are temporarily blocked to encourage taking the break
3. You can choose to play calming sounds ("humming" or "sound healing") during your break
4. After 20 seconds, the timer automatically restarts

Need flexibility? You can:
- Pause the timer before meetings or important work sessions
- Use the emergency skip button when you absolutely can't take a break
- The timer will resume its normal cycle afterward

## Development

- Main process: `src/main.js`
- Renderer process: `src/renderer.js`
- UI: `src/index.html`