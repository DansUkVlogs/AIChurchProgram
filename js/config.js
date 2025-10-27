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
    MAX_NOTES_LENGTH: 25, // Reduced to match PDF display limit
    MAX_PROGRAM_ITEM_LENGTH: 100
};

// Auto-fill logic rules
export const AUTO_FILL_RULES = {
    songs: {
        keywords: ['sasb', 'sof', 'song', 'hymn', 'chorus', 'worship'],
        // Default to Camera 2 with sensible sub-presets for performers
        default: { camera: '2 (1)', scene: '1', mic: 'Amb', notes: '' },
        wg: { camera: '2 (6)', scene: '1', mic: '2,3,4', notes: '' },
    // Piano performances should use Camera 2 with close-presets 2/3
    piano: { camera: '2 (2/3)', scene: '1', mic: 'Amb', notes: '' }
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
        // Band performances prefer Camera 2 with main-band preset (1)
        default: { camera: '2 (1)', scene: '1', mic: 'Amb', notes: '' }
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
export const EXAMPLE_PROGRAM = `Welcome & Opening Prayer
SASB 123 - Amazing Grace Band
Announcements & Notices
SOF 456 - Here I Am to Worship WG
SOF 456 - Here I Am to Worship WG
SASB 234 - How Great Thou Art Piano
Bible Reading - Romans 8:28-39
Prayer for Healing
Baptism Video Presentation
YP Spot - Youth Testimony
SOF 567 - Blessed Be Your Name Band
SOF 567 - Blessed Be Your Name Band
Message - The Power of Faith - Pastor David
SASB 345 - Just As I Am Piano
SASB 345 - Just As I Am Piano
Offering & Special Music
Bible Reading - Psalm 23
SASB 901 - Crown Him with Many Crowns WG
Fellowship Time Announcement
Closing Prayer - Elder Smith`;
