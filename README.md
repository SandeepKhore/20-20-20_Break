# 20-20-20 Break

An Electron application that helps reduce eye strain by reminding you to follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.

## Features

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

The app will run a timer for 20 minutes. When the timer completes, you'll receive a notification to take a 20-second break and look at something 20 feet away. After the break, the timer will automatically restart.

## Development

- Main process: `src/main.js`
- Renderer process: `src/renderer.js`
- UI: `src/index.html`
