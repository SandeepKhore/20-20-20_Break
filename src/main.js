import { app, BrowserWindow, screen, nativeImage, Tray, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import AutoLaunch from 'auto-launch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set NODE_ENV to development by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize settings store
const store = new Store();

// Initialize auto launcher only in production
const autoLauncher = process.env.NODE_ENV !== 'development' ? new AutoLaunch({
    name: '20-20-20-break',
    path: app.getPath('exe'),
    isHidden: true, // Prevents dock icon on launch
}) : null;

// Set default settings if not exists
if (!store.has('autoLaunch')) {
    store.set('autoLaunch', true);
}
if (!store.has('audioSetting')) {
    store.set('audioSetting', 'sound-healing'); // Default to sound-healing.mp3
}

let tray;
let breakWindows = [];
let timer;
let isPaused = false;
let pauseEndTime = null;
const WORK_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds
const BREAK_DURATION = 20 * 1000;      // 20 seconds in milliseconds
const MINUTE = 60 * 1000; // 1 minute in milliseconds

// Create break windows for all displays
function createBreakWindow() {
    // Clear any existing break windows
    breakWindows.forEach(window => {
        if (!window.isDestroyed()) {
            window.destroy();
        }
    });
    breakWindows = [];

    // Create a window for each display
    const displays = screen.getAllDisplays();
    displays.forEach((display) => {
        const { bounds } = display;
        
        const window = new BrowserWindow({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            frame: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            fullscreen: false, // Start without fullscreen
            focusable: true,
            movable: false,
            minimizable: false,
            maximizable: false,
            closable: false,
            fullscreenable: true,
            kiosk: false, // Start without kiosk
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false,  // Allow loading local resources
                audioPlayback: display.id === screen.getPrimaryDisplay().id  // Only enable audio on primary display
            }
        });
        
        // Set up window modes in sequence
        window.once('ready-to-show', () => {
            // First set fullscreen
            window.setFullScreen(true);
            // Then enable kiosk mode after a small delay
            setTimeout(() => {
                window.setKiosk(true);
            }, 100);
        });
        
        // Prevent window from losing focus
        window.on('blur', () => {
            window.focus();
        });
        
        // Additional window lock settings
        window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        window.setAlwaysOnTop(true, 'screen-saver', 1);

        window.loadFile(path.join(__dirname, 'break.html'));
        
        // Prevent window from being closed by user keyboard shortcuts
        window.setClosable(false);
        
        // Force the window to stay on top
        window.setAlwaysOnTop(true, 'screen-saver');

        breakWindows.push(window);
    });
}

// Start a break
function startBreak() {
    createBreakWindow();
    
    // End break after BREAK_DURATION
    setTimeout(() => {
        // Clean up all break windows
        breakWindows.forEach(window => {
            if (!window.isDestroyed()) {
                window.destroy();
            }
        });
        breakWindows = [];
        startTimer(); // Restart the timer for the next break
    }, BREAK_DURATION);
}

// Pause the timer for a specified duration
function pauseTimer(duration) {
    isPaused = true;
    pauseEndTime = Date.now() + duration;
    
    if (timer) {
        clearTimeout(timer);
    }
    
    // Resume after pause duration
    timer = setTimeout(() => {
        isPaused = false;
        pauseEndTime = null;
        startTimer();
    }, duration);

    // Update tray tooltip with pause end time
    if (tray) {
        const resumeTime = new Date(pauseEndTime);
        const hours = resumeTime.getHours().toString().padStart(2, '0');
        const minutes = resumeTime.getMinutes().toString().padStart(2, '0');
        tray.setToolTip(`Paused until ${hours}:${minutes}`);
        updateTrayMenu();
    }
}

// Start the timer for the next break
function startTimer(customDuration) {
    if (isPaused) {
        return;
    }

    if (timer) {
        clearTimeout(timer);
    }
    
    const duration = customDuration || WORK_DURATION;
    timer = setTimeout(() => {
        startBreak();
    }, duration);

    // Update tray tooltip with next break time
    if (tray) {
        const nextBreak = new Date(Date.now() + duration);
        const hours = nextBreak.getHours().toString().padStart(2, '0');
        const minutes = nextBreak.getMinutes().toString().padStart(2, '0');
        tray.setToolTip(`Next break at ${hours}:${minutes}`);
        updateTrayMenu();
    }
}

// Function to build and update the tray menu
function updateTrayMenu() {
    if (!tray) return;

    const pauseSubmenu = [
        { 
            label: 'For 1 hour',
            click: () => pauseTimer(60 * MINUTE),
            enabled: !isPaused
        },
        { 
            label: 'For 2 hours',
            click: () => pauseTimer(120 * MINUTE),
            enabled: !isPaused
        },
        { 
            label: 'Custom pause...',
            click: () => {
                // Create a small window for custom pause duration
                const customWindow = new BrowserWindow({
                    width: 300,
                    height: 150,
                    frame: true,
                    resizable: false,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    }
                });
                
                customWindow.loadFile(path.join(__dirname, 'custom-pause.html'));
            },
            enabled: !isPaused
        }
    ];

    const menuTemplate = [
        { label: '20-20-20 Break Timer', enabled: false },
        { type: 'separator' },
        {
            label: isPaused ? 'Resume Timer' : 'Pause Timer',
            submenu: isPaused ? null : pauseSubmenu,
            click: () => {
                if (isPaused) {
                    isPaused = false;
                    pauseEndTime = null;
                    startTimer();
                }
            }
        },
        { type: 'separator' },
        { 
            label: 'Start with System',
            type: 'checkbox',
            checked: store.get('autoLaunch'),
            enabled: process.env.NODE_ENV !== 'development',
            click: async () => {
                if (process.env.NODE_ENV === 'development') {
                    return;
                }
                const newState = !store.get('autoLaunch');
                store.set('autoLaunch', newState);
                if (newState) {
                    await autoLauncher.enable();
                } else {
                    await autoLauncher.disable();
                }
            }
        },
        {
            label: 'Break Sound',
            submenu: [
                {
                    label: 'Sound Healing',
                    type: 'radio',
                    checked: store.get('audioSetting') === 'sound-healing',
                    click: () => {
                        store.set('audioSetting', 'sound-healing');
                    }
                },
                {
                    label: 'Humming',
                    type: 'radio',
                    checked: store.get('audioSetting') === 'humming',
                    click: () => {
                        store.set('audioSetting', 'humming');
                    }
                },
                {
                    label: 'Disabled',
                    type: 'radio',
                    checked: store.get('audioSetting') === 'disabled',
                    click: () => {
                        store.set('audioSetting', 'disabled');
                    }
                }
            ]
        },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ];

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);
}

// Create the tray icon
function createTray() {
    try {
        tray = new Tray(nativeImage.createEmpty());
        tray.setTitle('👁️');
        updateTrayMenu();
    } catch (error) {
        console.error('Failed to create tray:', error);
    }
}

// Handle asset path requests
ipcMain.on('get-asset-path', (event, assetName) => {
    event.returnValue = path.join(__dirname, 'assets', assetName);
});

// Handle audio setting request
ipcMain.on('get-audio-setting', (event) => {
    event.returnValue = store.get('audioSetting');
});

// Handle break skip request
ipcMain.on('skip-break', () => {
    breakWindows.forEach(window => {
        if (!window.isDestroyed()) {
            window.destroy();
        }
    });
    breakWindows = [];
    startTimer();
});

// Handle custom pause duration
ipcMain.on('set-custom-pause', (_, minutes) => {
    pauseTimer(minutes * MINUTE);
});

// Hide dock icon on macOS
if (process.platform === 'darwin') {
    app.dock.hide();
}

// Initialize the app
app.whenReady().then(async () => {
    // Set up auto-launch based on stored setting (only in production)
    if (process.env.NODE_ENV !== 'development') {
        try {
            const shouldAutoLaunch = store.get('autoLaunch');
            const isEnabled = await autoLauncher.isEnabled();
            
            if (shouldAutoLaunch && !isEnabled) {
                await autoLauncher.enable();
            } else if (!shouldAutoLaunch && isEnabled) {
                await autoLauncher.disable();
            }
        } catch (error) {
            console.error('Failed to configure auto-launch:', error);
        }
    }

    createTray();
    startTimer();
});

// Prevent the app from closing when all windows are closed
app.on('window-all-closed', (e) => {
    e.preventDefault();
});

// Quit the app when quit is selected from the tray menu
app.on('before-quit', () => {
    breakWindows.forEach(window => {
        if (!window.isDestroyed()) {
            window.destroy();
        }
    });
    breakWindows = [];
});