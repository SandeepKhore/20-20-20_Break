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

let tray;
let breakWindow;
let timer;
const WORK_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds
const BREAK_DURATION = 20 * 1000;      // 20 seconds in milliseconds

// Create the break window that blocks the screen
function createBreakWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    breakWindow = new BrowserWindow({
        width,
        height,
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,  // Allow loading local resources
            audioPlayback: true  // Explicitly enable audio
        }
    });

    breakWindow.loadFile(path.join(__dirname, 'break.html'));
    
    // Prevent window from being closed by user keyboard shortcuts
    breakWindow.setClosable(false);
    
    // Force the window to stay on top
    breakWindow.setAlwaysOnTop(true, 'screen-saver');
}

// Start a break
function startBreak() {
    createBreakWindow();
    
    // End break after BREAK_DURATION
    setTimeout(() => {
        if (breakWindow) {
            breakWindow.destroy(); // Use destroy instead of close
            breakWindow = null;
        }
        startTimer(); // Restart the timer for the next break
    }, BREAK_DURATION);
}

// Start the timer for the next break
function startTimer() {
    if (timer) {
        clearTimeout(timer);
    }
    
    timer = setTimeout(() => {
        startBreak();
    }, WORK_DURATION);

    // Update tray tooltip with next break time
    if (tray) {
        const nextBreak = new Date(Date.now() + WORK_DURATION);
        const hours = nextBreak.getHours().toString().padStart(2, '0');
        const minutes = nextBreak.getMinutes().toString().padStart(2, '0');
        tray.setToolTip(`Next break at ${hours}:${minutes}`);
    }
}

// Create the tray icon
function createTray() {
    try {
        tray = new Tray(nativeImage.createEmpty());
        tray.setTitle('👁️');
        
        const contextMenu = Menu.buildFromTemplate([
            { label: '20-20-20 Break Timer', enabled: false },
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
            { type: 'separator' },
            { label: 'Quit', click: () => app.quit() }
        ]);
        
        tray.setContextMenu(contextMenu);
    } catch (error) {
        console.error('Failed to create tray:', error);
    }
}

// Handle asset path requests
ipcMain.on('get-asset-path', (event, assetName) => {
    event.returnValue = path.join(__dirname, 'assets', assetName);
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
    if (breakWindow) {
        breakWindow.destroy();
    }
});