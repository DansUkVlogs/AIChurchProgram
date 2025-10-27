// Pattern Matching and Similarity Detection for AI Learning
// This file analyzes text patterns and finds similar program items

import { AI_CONFIG } from './ai-config.js';

/**
 * AIPatterns - Pattern matching and similarity detection
 * 
 * This class handles:
 * - Text pattern analysis and matching
 * - Similarity calculations between program items
 * - Feature extraction from text
 * - Pattern statistics and analysis
 */
export class AIPatterns {
    constructor() {
        // Initialize pattern matching system
        if (AI_CONFIG.DEBUG.ENABLE_CONSOLE_LOGS) {
            console.log('🔍 AIPatterns initialized');
        }
    }

    /**
     * Compatibility wrapper used by AILearning.predictPatternBased.
     * Loads stored patterns and returns an array of matching pattern objects
     * with a `techValues` property (backwards-compatible shape).
     * If there are no stored patterns, returns an empty array.
     * @param {Object|string} programItem
     * @param {string} field
     */
    async findMatchingPatterns(programItem, field) {
        try {
            const stored = await this.loadPatterns();
            if (!stored || stored.length === 0) return [];

            // Normalize the input text for matching - support programItem objects with title
            const inputText = (programItem && (programItem.title || programItem.programItem)) ? (programItem.title || programItem.programItem) : ('' + programItem);

            // Use existing class matcher to find similar patterns
            const rawMatches = this.findSimilarPatterns(inputText, stored, false);

            // Map stored examples to the shape AILearning expects: { techValues: {...}, ... }
            const mapped = rawMatches.map(match => {
                const example = match.example || match; // tolerance for shapes
                // stored patterns may keep user values in `userValues` or `techValues`
                const techValues = example.userValues || example.techValues || {};
                return Object.assign({}, example, {
                    similarity: match.similarity || {},
                    weight: match.weight || 0,
                    techValues: techValues
                });
            });

            return mapped;
        } catch (error) {
            console.error('❌ Error in findMatchingPatterns compatibility wrapper:', error);
            return [];
        }
    }

    // Main function to find similar patterns in learning data
    findSimilarPatterns(programItem, learningData, isThirdSunday) {
    const startTime = performance.now();
    
    try {
        // Normalize the input text
        const normalizedInput = this.normalizeText(programItem);
        const inputFeatures = this.extractTextFeatures(normalizedInput);
        
        // Find all matching patterns
        const matches = [];
        
        for (const example of learningData) {
            const similarity = this.calculateSimilarity(
                normalizedInput, 
                this.normalizeText(example.programItem),
                inputFeatures,
                this.extractTextFeatures(example.programItem),
                isThirdSunday,
                example.context.isThirdSunday
            );
            
            if (similarity.score > AI_CONFIG.TEXT_ANALYSIS.SIMILARITY_THRESHOLD) {
                matches.push({
                    example: example,
                    similarity: similarity,
                    weight: this.calculateWeight(similarity.score, example.context.timestamp)
                });
            }
        }
        
        // Sort by weighted similarity (best matches first)
        matches.sort((a, b) => b.weight - a.weight);
        
        // Log performance if debugging enabled
        if (AI_CONFIG.DEBUG.ENABLE_PERFORMANCE_TRACKING) {
            const endTime = performance.now();
            console.log(`🔍 Pattern matching completed in ${(endTime - startTime).toFixed(2)}ms, found ${matches.length} matches`);
        }
        
        return matches;
        
    } catch (error) {
        console.error('❌ Error in pattern matching:', error);
        return [];
    }
}

    // Normalize text for comparison
    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')                    // Normalize whitespace
            .replace(/[^\w\s\-]/g, ' ')              // Remove punctuation except hyphens
            .replace(/\b(sasb|sof)\s*(\d+)/g, '$1$2') // Normalize song numbers (SASB 123 -> sasb123)
            .replace(/\d+/g, 'NUM')                  // Replace numbers with placeholder
            .trim();
    }

    // Extract features from text for comparison
    extractTextFeatures(text) {
        const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter(word => word.length > 0);
    
    return {
        // Basic features
        wordCount: words.length,
        charCount: normalized.length,
        hasNumbers: /\d/.test(text),
        
        // Word-based features
        words: Array.from(new Set(words)), // Convert Set to Array for Firebase compatibility
        uniqueWordCount: new Set(words).size,
        
        // Important keywords
        importantKeywords: words.filter(word => 
            AI_CONFIG.TEXT_ANALYSIS.IMPORTANT_KEYWORDS.includes(word.toLowerCase())
        ),
        
        // Patterns
        hasSongNumber: /\b(sasb|sof)\s*\d+/i.test(text),
        hasPersonName: this.detectPersonName(text),
        hasPerformer: this.detectPerformer(text),
        
        // Structure
        startsWithNumber: /^\d/.test(text.trim()),
        endsWithDash: text.trim().endsWith('-'),
        hasParentheses: /\([^)]*\)/.test(text),
        
        // Content type indicators
        contentType: this.classifyContentType(text),
        performer: this.extractPerformerType(text),
        songType: this.extractSongType(text)
    };
}

    // Calculate similarity between two texts and their features
    calculateSimilarity(text1, text2, features1, features2, context1, context2) {
    const scores = {
        textual: 0,
        structural: 0,
        semantic: 0,
        contextual: 0
    };
    
    // 1. Textual similarity (exact word matches)
    scores.textual = this.calculateTextualSimilarity(features1.words, features2.words);
    
    // 2. Structural similarity (length, format, patterns)
    scores.structural = this.calculateStructuralSimilarity(features1, features2);
    
    // 3. Semantic similarity (meaning and content type)
    scores.semantic = this.calculateSemanticSimilarity(features1, features2);
    
    // 4. Contextual similarity (3rd Sunday, position, etc.)
    scores.contextual = this.calculateContextualSimilarity(context1, context2);
    
    // Weighted average of all similarity scores
    const weights = {
        textual: 0.4,    // Exact word matches are important
        structural: 0.2,  // Structure matters but less
        semantic: 0.3,    // Meaning is very important
        contextual: 0.1   // Context provides fine-tuning
    };
    
    const overallScore = 
        scores.textual * weights.textual +
        scores.structural * weights.structural +
        scores.semantic * weights.semantic +
        scores.contextual * weights.contextual;
    
    return {
        score: overallScore,
        breakdown: scores,
        confidence: this.calculateConfidence(scores, features1, features2)
    };
}

    // Calculate textual similarity (word overlap)
    calculateTextualSimilarity(words1, words2) {
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    if (union.size === 0) return 0;
    
    // Jaccard similarity with boost for important keywords
    let score = intersection.size / union.size;
    
    // Boost score if important keywords match
    const importantMatches = [...intersection].filter(word =>
        AI_CONFIG.TEXT_ANALYSIS.IMPORTANT_KEYWORDS.includes(word)
    ).length;
    
    if (importantMatches > 0) {
        score += (importantMatches * 0.1); // Boost for each important keyword match
    }
    
    return Math.min(score, 1.0);
}

    // Calculate structural similarity (format and patterns)
    calculateStructuralSimilarity(features1, features2) {
    let score = 0;
    let factors = 0;
    
    // Word count similarity
    const wordCountDiff = Math.abs(features1.wordCount - features2.wordCount);
    const maxWordCount = Math.max(features1.wordCount, features2.wordCount);
    if (maxWordCount > 0) {
        score += (1 - wordCountDiff / maxWordCount);
        factors++;
    }
    
    // Boolean feature matches
    const booleanFeatures = [
        'hasNumbers', 'hasSongNumber', 'hasPersonName', 'hasPerformer',
        'startsWithNumber', 'endsWithDash', 'hasParentheses'
    ];
    
    for (const feature of booleanFeatures) {
        if (features1[feature] === features2[feature]) {
            score += 1;
        }
        factors++;
    }
    
    return factors > 0 ? score / factors : 0;
}

    // Calculate semantic similarity (meaning and content)
    calculateSemanticSimilarity(features1, features2) {
    let score = 0;
    let factors = 0;
    
    // Content type match
    if (features1.contentType === features2.contentType && features1.contentType !== 'other') {
        score += 0.8; // Strong match for content type
    }
    factors++;
    
    // Performer match
    if (features1.performer === features2.performer && features1.performer !== 'unknown') {
        score += 0.6; // Good match for performer
    }
    factors++;
    
    // Song type match (for songs)
    if (features1.songType === features2.songType && features1.songType !== 'unknown') {
        score += 0.4; // Moderate match for song type
    }
    factors++;
    
    // Important keyword overlap
    const keywords1 = new Set(features1.importantKeywords);
    const keywords2 = new Set(features2.importantKeywords);
    const keywordIntersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const keywordUnion = new Set([...keywords1, ...keywords2]);
    
    if (keywordUnion.size > 0) {
        score += (keywordIntersection.size / keywordUnion.size);
        factors++;
    }
    
    return factors > 0 ? score / factors : 0;
}

    // Calculate contextual similarity (3rd Sunday, etc.)
    calculateContextualSimilarity(context1, context2) {
    let score = 0;
    let factors = 0;
    
    // 3rd Sunday context match
    if (context1 === context2) {
        score += 1; // Perfect match for 3rd Sunday context
    } else {
        score += 0.3; // Still some relevance even if context differs
    }
    factors++;
    
    return factors > 0 ? score / factors : 0;
}

    // Calculate confidence in the similarity score
    calculateConfidence(scores, features1, features2) {
    // Base confidence from average of all scores
    const avgScore = (scores.textual + scores.structural + scores.semantic + scores.contextual) / 4;
    
    // Adjust confidence based on various factors
    let confidence = avgScore;
    
    // Boost confidence for exact content type matches
    if (features1.contentType === features2.contentType && features1.contentType !== 'other') {
        confidence += 0.1;
    }
    
    // Boost confidence for exact performer matches
    if (features1.performer === features2.performer && features1.performer !== 'unknown') {
        confidence += 0.1;
    }
    
    // Reduce confidence for very different text lengths
    const lengthRatio = Math.min(features1.charCount, features2.charCount) / 
                       Math.max(features1.charCount, features2.charCount);
    if (lengthRatio < 0.5) {
        confidence *= 0.8; // Reduce confidence for very different lengths
    }
    
    return Math.min(confidence, 1.0);
}

    // Calculate weight based on similarity and recency
    calculateWeight(similarityScore, timestamp) {
        // Base weight is the similarity score
        let weight = similarityScore;
        
        // Apply recency weighting
        const now = new Date();
        const exampleDate = new Date(timestamp);
        const daysDifference = (now - exampleDate) / (1000 * 60 * 60 * 24);
        
        // Recent examples get higher weight
        const recencyFactor = Math.exp(-daysDifference / 30); // Exponential decay over 30 days
        weight *= (1 - AI_CONFIG.LEARNING.RECENCY_WEIGHT) + (AI_CONFIG.LEARNING.RECENCY_WEIGHT * recencyFactor);
        
        return weight;
    }

    // Helper functions for feature extraction

    detectPersonName(text) {
    // Simple heuristic: capitalized words that aren't known keywords
    const words = text.split(/\s+/);
    const capitalizedWords = words.filter(word => 
        /^[A-Z][a-z]+$/.test(word) && 
        !AI_CONFIG.TEXT_ANALYSIS.IMPORTANT_KEYWORDS.includes(word.toLowerCase())
    );
    return capitalizedWords.length > 0;
}

    detectPerformer(text) {
        const performers = ['band', 'piano', 'wg', 'worship group', 'choir', 'solo', 'quartet'];
        return performers.some(performer => 
            text.toLowerCase().includes(performer)
        );
    }

    classifyContentType(text) {
    const lowerText = text.toLowerCase();
    
    // Check in order of specificity
    if (/\b(sasb|sof)\s*\d+/.test(lowerText)) return 'song';
    if (lowerText.includes('prayer')) return 'prayer';
    if (lowerText.includes('reading') || lowerText.includes('scripture')) return 'reading';
    if (lowerText.includes('message') || lowerText.includes('sermon')) return 'message';
    if (lowerText.includes('announcement')) return 'announcement';
    if (lowerText.includes('offering')) return 'offering';
    if (lowerText.includes('video') || lowerText.includes('presentation')) return 'media';
    if (lowerText.includes('yp') || lowerText.includes('youth')) return 'youth';
    if (lowerText.includes('benediction') || lowerText.includes('blessing')) return 'benediction';
    
    return 'other';
}

    extractPerformerType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('band')) return 'band';
        if (lowerText.includes('piano')) return 'piano';
        if (lowerText.includes('wg') || lowerText.includes('worship group')) return 'worship_group';
        if (lowerText.includes('choir')) return 'choir';
        if (lowerText.includes('solo')) return 'solo';
        if (lowerText.includes('quartet')) return 'quartet';
        
        return 'unknown';
    }

    extractSongType(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('sasb')) return 'sasb';
        if (lowerText.includes('sof')) return 'sof';
        if (lowerText.includes('hymn')) return 'hymn';
        if (lowerText.includes('chorus')) return 'chorus';
        if (lowerText.includes('worship')) return 'worship';
        
        return 'unknown';
    }

    // Create a summary of the patterns found
    getPatternSummary(matches) {
    if (matches.length === 0) {
        return {
            totalMatches: 0,
            avgSimilarity: 0,
            avgConfidence: 0,
            topContentTypes: [],
            topPerformers: []
        };
    }
    
    const totalMatches = matches.length;
    const avgSimilarity = matches.reduce((sum, match) => sum + match.similarity.score, 0) / totalMatches;
    const avgConfidence = matches.reduce((sum, match) => sum + match.similarity.confidence, 0) / totalMatches;
    
    // Analyze content types and performers
    const contentTypes = {};
    const performers = {};
    
    matches.forEach(match => {
        const contentType = match.example.learningData?.itemType || 'unknown';
        const performer = match.example.learningData?.performer || 'unknown';
        
        contentTypes[contentType] = (contentTypes[contentType] || 0) + match.weight;
        performers[performer] = (performers[performer] || 0) + match.weight;
    });
    
    const topContentTypes = Object.entries(contentTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type, weight]) => ({ type, weight }));
    
    const topPerformers = Object.entries(performers)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([performer, weight]) => ({ performer, weight }));
    
    return {
        totalMatches,
        avgSimilarity,
        avgConfidence,
        topContentTypes,
        topPerformers
    };
}

    // Load patterns from database
    async loadPatterns() {
        try {
            if (AI_CONFIG.DEBUG.ENABLE_CONSOLE_LOGS) {
                console.log('🔍 Loading patterns from database...');
            }
            
            // This method would load patterns from the database
            // For now, return empty array as patterns are loaded on-demand
            return [];
            
        } catch (error) {
            console.error('❌ Error loading patterns:', error);
            return [];
        }
    }

    // Get count of stored patterns
    getPatternCount() {
        try {
            // For now, return 0 as patterns are generated on-demand
            // In a full implementation, this would count stored patterns
            return 0;
            
        } catch (error) {
            console.error('❌ Error getting pattern count:', error);
            return 0;
        }
    }

    // Add a new pattern to the database
    async addPattern(programItem, userValues, context) {
        try {
            if (AI_CONFIG.DEBUG.ENABLE_CONSOLE_LOGS) {
                console.log('🔍 Adding new pattern to database...', { programItem, userValues, context });
            }
            
            // Import database module
            const { AIDatabase } = await import('./ai-database.js');
            const database = new AIDatabase();
            
            // Create pattern data to store
            const patternData = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                programItem: programItem,
                userValues: userValues,
                context: context,
                timestamp: new Date().toISOString(),
                features: this.extractTextFeatures(programItem.title || programItem.programItem || '')
            };
            
            // Save to database
            const success = await database.saveData('patterns', patternData);
            
            if (success) {
                console.log('✅ Pattern added to database successfully');
            } else {
                console.warn('⚠️ Pattern saved to localStorage only (Firebase unavailable)');
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ Error adding pattern:', error);
            return false;
        }
    }

    /**
     * Save all patterns to database (called by AI learning system)
     */
    async savePatterns() {
        try {
            console.log('[AI Patterns] Saving patterns to database...');
            
            // Import database module
            const { AIDatabase } = await import('./ai-database.js');
            const database = new AIDatabase();
            
            // Get all current patterns from local storage or memory
            const patterns = this.storedPatterns || [];
            
            if (patterns.length > 0) {
                await database.saveData('all_patterns', {
                    patterns: patterns,
                    count: patterns.length,
                    lastUpdated: new Date().toISOString()
                });
                console.log(`✅ Saved ${patterns.length} patterns to database`);
            } else {
                console.log('ℹ️ No patterns to save');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error saving patterns:', error);
            return false;
        }
    }
}

// Export additional utility functions for backward compatibility
export function getPatternSummary(matches) {
    const patterns = new AIPatterns();
    return patterns.getPatternSummary(matches);
}

export function findSimilarPatterns(programItem, learningData, isThirdSunday) {
    const patterns = new AIPatterns();
    return patterns.findSimilarPatterns(programItem, learningData, isThirdSunday);
}