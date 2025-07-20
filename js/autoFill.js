// Auto-fill logic for church program items

import { AUTO_FILL_RULES } from './config.js';

export function applyAutoFillLogic(item, isThirdSunday = false) {
    // Clean up the text first - remove extra spaces and normalize
    item.programItem = item.programItem
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();               // Remove leading/trailing spaces
    
    const text = item.programItem.toLowerCase();
    const originalText = item.programItem;
    
    // Enhanced parsing - extract key information
    const parsedInfo = parseItemText(originalText);
    
    // Song detection (SASB, SOF, song, hymn, etc.)
    if (containsAny(text, AUTO_FILL_RULES.songs.keywords) || parsedInfo.hasSongNumber) {
        if (parsedInfo.performer === 'piano' || text.includes('piano')) {
            // Piano songs - specific camera and settings
            Object.assign(item, AUTO_FILL_RULES.songs.piano);
        } else if (parsedInfo.performer === 'wg' || parsedInfo.performer === 'worship group' || text.includes('wg') || text.includes('worship group')) {
            // WG Songs
            Object.assign(item, AUTO_FILL_RULES.songs.wg);
        } else if (parsedInfo.performer === 'band' || text.includes('band')) {
            // Band songs
            Object.assign(item, AUTO_FILL_RULES.band.default);
        } else {
            // Regular songs
            Object.assign(item, AUTO_FILL_RULES.songs.default);
        }
    }
    // Offering
    else if (containsAny(text, AUTO_FILL_RULES.offering.keywords)) {
        if (text.includes('announcement')) {
            // Announcements + Offering
            Object.assign(item, AUTO_FILL_RULES.offering.withAnnouncements);
        } else {
            // Offering only
            Object.assign(item, AUTO_FILL_RULES.offering.default);
        }
    }
    // Announcements only
    else if (containsAny(text, AUTO_FILL_RULES.announcements.keywords)) {
        Object.assign(item, AUTO_FILL_RULES.announcements.default);
    }
    // YP Spot
    else if (containsAny(text, AUTO_FILL_RULES.ypSpot.keywords)) {
        if (isThirdSunday) {
            Object.assign(item, AUTO_FILL_RULES.ypSpot.thirdSunday);
        } else {
            Object.assign(item, AUTO_FILL_RULES.ypSpot.default);
        }
    }
    // Bible Reading
    else if (containsAny(text, AUTO_FILL_RULES.bibleReading.keywords)) {
        if (isThirdSunday) {
            Object.assign(item, AUTO_FILL_RULES.bibleReading.thirdSunday);
        } else {
            Object.assign(item, AUTO_FILL_RULES.bibleReading.default);
        }
    }
    // Benediction
    else if (containsAny(text, AUTO_FILL_RULES.benediction.keywords)) {
        Object.assign(item, AUTO_FILL_RULES.benediction.default);
    }
    // Message/Sermon
    else if (containsAny(text, AUTO_FILL_RULES.message.keywords)) {
        Object.assign(item, AUTO_FILL_RULES.message.default);
    }
    // Prayer
    else if (containsAny(text, AUTO_FILL_RULES.prayer.keywords)) {
        Object.assign(item, AUTO_FILL_RULES.prayer.default);
    }
    // Band specific
    else if (containsAny(text, AUTO_FILL_RULES.band.keywords)) {
        Object.assign(item, AUTO_FILL_RULES.band.default);
    }
    // Enhanced detection based on parsed information
    else if (parsedInfo.itemType) {
        const detectedSettings = detectByItemType(parsedInfo, isThirdSunday);
        if (detectedSettings) {
            Object.assign(item, detectedSettings);
        } else {
            item.notes = 'Unmatched - requires manual input';
        }
    }
    // If no matches found, leave blank for user input
    else {
        item.notes = 'Unmatched - requires manual input';
    }
    
    return item;
}

// Enhanced text parsing to extract song numbers, item type, and performer
function parseItemText(text) {
    const info = {
        hasSongNumber: false,
        songNumber: null,
        itemType: null,
        performer: null,
        hasVideo: false
    };
    
    // Extract song numbers (SOF 123, SASB 456, etc.)
    const songMatch = text.match(/(sof|sasb)\s*(\d+)/i);
    if (songMatch) {
        info.hasSongNumber = true;
        info.songNumber = songMatch[2];
    }
    
    // Extract performer from end of text (common names/groups)
    const performers = [
        'wg', 'worship group', 'band', 'piano', 'pam', 'nigel', 'nige', 'toni', 
        'elizabeth', 'emma', 'verity', 'hope', 'handheld', 'lectern', 'amb'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    const lastWords = words.slice(-3); // Check last 3 words
    
    for (const performer of performers) {
        if (lastWords.some(word => word.includes(performer))) {
            info.performer = performer;
            break;
        }
    }
    
    // Detect item types
    if (text.toLowerCase().includes('video') || text.includes('https://') || text.includes('youtube')) {
        info.hasVideo = true;
        info.itemType = 'video';
    } else if (text.toLowerCase().includes('welcome')) {
        info.itemType = 'welcome';
    } else if (text.toLowerCase().includes('prayer')) {
        info.itemType = 'prayer';
    } else if (text.toLowerCase().includes('message')) {
        info.itemType = 'message';
    } else if (text.toLowerCase().includes('reading')) {
        info.itemType = 'reading';
    } else if (text.toLowerCase().includes('announcement')) {
        info.itemType = 'announcements';
    } else if (text.toLowerCase().includes('offering')) {
        info.itemType = 'offering';
    }
    
    return info;
}

// Detect settings based on parsed item type and performer
function detectByItemType(parsedInfo, isThirdSunday) {
    if (parsedInfo.hasVideo) {
        return { camera: '1', scene: '1', mic: 'AV', notes: '' };
    }
    
    switch (parsedInfo.itemType) {
        case 'welcome':
            return { camera: '3', scene: '1', mic: '2', notes: '' };
        case 'prayer':
            return { camera: '4', scene: '1', mic: 'Lectern', notes: '' };
        case 'message':
            return { camera: '4', scene: '3', mic: 'Lectern', notes: '' };
        case 'reading':
            if (isThirdSunday) {
                return { camera: '2', scene: '1', mic: '2', notes: '' };
            }
            return { camera: '4', scene: '1', mic: 'Lectern', notes: '' };
        case 'announcements':
            return { camera: '4', scene: '1', mic: 'Lectern', notes: '' };
        case 'offering':
            return { camera: '1', scene: '1', mic: 'AV', notes: '' };
    }
    
    // Performer-based detection
    if (parsedInfo.performer) {
        switch (parsedInfo.performer) {
            case 'wg':
            case 'worship group':
                return { camera: '2', scene: '1', mic: '2,3,4', notes: '' };
            case 'band':
                return { camera: '2', scene: '1', mic: 'Amb', notes: '' };
            case 'piano':
                return { camera: '3', scene: '1', mic: 'Amb', notes: '' };
            case 'handheld':
                return { camera: '3', scene: '2', mic: 'Handheld', notes: '' };
            case 'lectern':
                return { camera: '4', scene: '1', mic: 'Lectern', notes: '' };
        }
    }
    
    return null;
}

// Helper function to check if text contains any of the keywords
function containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

// Get suggestions for unmatched items based on similarity
export function getSuggestions(text) {
    const suggestions = [];
    const lowerText = text.toLowerCase();
    
    // Check for partial matches and suggest auto-fill rules
    Object.entries(AUTO_FILL_RULES).forEach(([ruleName, rule]) => {
        rule.keywords.forEach(keyword => {
            if (lowerText.includes(keyword.substring(0, 3))) {
                suggestions.push({
                    rule: ruleName,
                    keyword: keyword,
                    confidence: calculateSimilarity(lowerText, keyword)
                });
            }
        });
    });
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// Simple string similarity calculation
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - editDistance(longer, shorter)) / longer.length;
}

// Calculate edit distance between two strings
function editDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Validate auto-filled data
export function validateAutoFill(item) {
    const issues = [];
    
    if (!item.camera) issues.push('Missing camera setting');
    if (!item.scene) issues.push('Missing scene setting');
    if (!item.mic) issues.push('Missing mic setting');
    
    return {
        valid: issues.length === 0,
        issues: issues
    };
}
