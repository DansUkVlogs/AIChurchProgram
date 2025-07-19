// Auto-fill logic for church program items

import { AUTO_FILL_RULES } from './config.js';

export function applyAutoFillLogic(item, isThirdSunday = false) {
    const text = item.programItem.toLowerCase();
    
    // Song detection (SASB, SOF, song, hymn, etc.)
    if (containsAny(text, AUTO_FILL_RULES.songs.keywords)) {
        if (text.includes('piano')) {
            // Piano songs - specific camera and settings
            Object.assign(item, AUTO_FILL_RULES.songs.piano);
        } else if (text.includes('wg') || text.includes('worship group')) {
            // WG Songs
            Object.assign(item, AUTO_FILL_RULES.songs.wg);
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
    // If no matches found, leave blank for user input
    else {
        item.notes = 'Unmatched - requires manual input';
    }
    
    return item;
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
