// Configuration and constants for the Church Program Smart Assistant

export const CONFIG = {
    // Application settings
    APP_VERSION: '1.0',
    STORAGE_KEYS: {
        THEME: 'theme',
        LAST_PROGRAM: 'lastProgram'
    },
    
    // File settings
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    SUPPORTED_FILE_TYPES: ['.txt', '.json'],
    
    // UI settings
    ANIMATION_DELAY: 100, // ms between row animations
    ALERT_DURATION: 5000, // ms
    MODAL_TRANSITION_DELAY: 300, // ms
    
    // Export settings
    PDF_FILENAME: 'church-program-schedule.pdf',
    JSON_FILENAME: 'church-program-data.json',
    
    // Field limits
    MAX_MIC_LENGTH: 20,
    MAX_NOTES_LENGTH: 50,
    MAX_PROGRAM_ITEM_LENGTH: 100
};

// Auto-fill logic rules
export const AUTO_FILL_RULES = {
    songs: {
        keywords: ['sasb', 'sof', 'song', 'hymn', 'chorus', 'worship'],
        default: { camera: '2', scene: '1', mic: 'Amb', notes: '' },
        wg: { camera: '2', scene: '1', mic: '2,3,4', notes: '' },
        piano: { camera: '3', scene: '1', mic: 'Amb', notes: '' }
    },
    
    offering: {
        keywords: ['offering'],
        default: { camera: '1', scene: '1', mic: 'AV', notes: '' },
        withAnnouncements: { camera: '2/1', scene: '1', mic: '2/AV', notes: '' }
    },
    
    announcements: {
        keywords: ['announcement'],
        default: { camera: '4', scene: '1', mic: 'Lectern', notes: '' }
    },
    
    ypSpot: {
        keywords: ['yp', 'young people', 'youth'],
        default: { camera: '3', scene: '2', mic: 'Headset', notes: '' },
        thirdSunday: { camera: '3', scene: '2', mic: 'Handheld', notes: '' }
    },
    
    bibleReading: {
        keywords: ['bible reading', 'scripture', 'reading'],
        default: { camera: '4', scene: '1', mic: 'Lectern', notes: '' },
        thirdSunday: { camera: '2', scene: '1', mic: '2', notes: '' }
    },
    
    message: {
        keywords: ['message', 'sermon', 'address'],
        default: { camera: '4', scene: '3', mic: 'Lectern', notes: '' }
    },
    
    prayer: {
        keywords: ['prayer'],
        default: { camera: '4', scene: '1', mic: 'Lectern', notes: '' }
    },
    
    band: {
        keywords: ['band'],
        default: { camera: '2', scene: '1', mic: 'Amb', notes: '' }
    },
    
    benediction: {
        keywords: ['benediction'],
        default: { camera: '3', scene: '1', mic: 'Lectern', notes: '' }
    }
};

// Dropdown options for form fields
export const FORM_OPTIONS = {
    camera: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' }
    ],
    
    scene: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' }
    ]
};

// Theme configurations
export const THEMES = {
    light: {
        name: 'Light',
        icon: 'fas fa-moon'
    },
    dark: {
        name: 'Dark',
        icon: 'fas fa-sun'
    }
};

// Example program data
export const EXAMPLE_PROGRAM = `Opening Prayer
SASB 123 Band
Welcome & Announcements
SOF 456 WG
Bible Reading - John 3:16
YP Spot - Youth Testimony
Message - Pastor John
Offering
SASB 789
Closing Prayer`;
