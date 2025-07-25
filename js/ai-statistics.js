// AI Statistics Module - Statistical analysis and confidence scoring for the Church Program Smart Assistant
// This module handles mathematical analysis of patterns, calculates confidence scores, and provides
// statistical insights to help the AI make better predictions

import { AI_CONFIG } from './ai-config.js';
import { AIDatabase } from './ai-database.js';

/**
 * AIStatistics - Handles statistical analysis and confidence scoring
 * 
 * Key functions:
 * - Calculate confidence scores for predictions
 * - Analyze pattern frequency and reliability
 * - Provide statistical insights for decision making
 * - Track prediction accuracy over time
 */
export class AIStatistics {
    constructor() {
        this.database = new AIDatabase();
        this.accuracyHistory = [];
        this.fieldStatistics = {};
        
        // Initialize field statistics for each tech field
        AI_CONFIG.TECH_FIELDS.forEach(field => {
            this.fieldStatistics[field] = {
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                commonValues: {},
                patternStrength: {}
            };
        });
    }

    /**
     * Calculate confidence score for a prediction
     * @param {Object} prediction - The prediction object with field values
     * @param {Array} matchingPatterns - Array of patterns that match the input
     * @param {string} field - The tech field being predicted
     * @returns {number} Confidence score between 0 and 1
     */
    calculateConfidence(prediction, matchingPatterns, field) {
        if (!matchingPatterns || matchingPatterns.length === 0) {
            return 0;
        }

        // Base confidence from pattern matching strength
        let confidence = 0;
        let totalWeight = 0;

        matchingPatterns.forEach(pattern => {
            const weight = pattern.confidence || 0.5;
            confidence += pattern.similarity * weight;
            totalWeight += weight;
        });

        // Normalize by total weight
        if (totalWeight > 0) {
            confidence = confidence / totalWeight;
        }

        // Boost confidence based on pattern frequency
        const frequencyBoost = this.calculateFrequencyBoost(prediction[field], field);
        confidence = Math.min(1, confidence + frequencyBoost);

        // Apply field-specific accuracy modifier
        const fieldAccuracy = this.fieldStatistics[field]?.accuracy || 0.5;
        confidence = confidence * (0.7 + 0.3 * fieldAccuracy);

        // Apply minimum confidence threshold
        if (confidence < AI_CONFIG.MIN_CONFIDENCE) {
            confidence = 0;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Calculate frequency boost based on how common a value is
     * @param {string} value - The predicted value
     * @param {string} field - The tech field
     * @returns {number} Boost amount (0 to 0.2)
     */
    calculateFrequencyBoost(value, field) {
        const fieldStats = this.fieldStatistics[field];
        if (!fieldStats || !fieldStats.commonValues[value]) {
            return 0;
        }

        const frequency = fieldStats.commonValues[value];
        const totalPredictions = fieldStats.totalPredictions;
        
        if (totalPredictions === 0) return 0;
        
        const relativeFrequency = frequency / totalPredictions;
        
        // Boost common values slightly (max 0.2 boost)
        return Math.min(0.2, relativeFrequency * 0.4);
    }

    /**
     * Update statistics when a prediction is made
     * @param {string} field - The tech field
     * @param {string} predictedValue - What the AI predicted
     * @param {string} actualValue - What the user actually chose
     * @param {number} confidence - The confidence score of the prediction
     */
    updatePredictionStats(field, predictedValue, actualValue, confidence) {
        const fieldStats = this.fieldStatistics[field];
        if (!fieldStats) return;

        fieldStats.totalPredictions++;
        
        // Update accuracy
        const wasCorrect = predictedValue === actualValue;
        if (wasCorrect) {
            fieldStats.correctPredictions++;
        }
        
        fieldStats.accuracy = fieldStats.correctPredictions / fieldStats.totalPredictions;

        // Update value frequency tracking (skip empty strings for Firebase compatibility)
        if (actualValue && actualValue.trim() !== '') {
            if (!fieldStats.commonValues[actualValue]) {
                fieldStats.commonValues[actualValue] = 0;
            }
            fieldStats.commonValues[actualValue]++;
        }

        // Track accuracy history for overall system performance
        this.accuracyHistory.push({
            timestamp: Date.now(),
            field: field,
            predicted: predictedValue,
            actual: actualValue,
            confidence: confidence,
            correct: wasCorrect
        });

        // Keep only recent history (last 1000 predictions)
        if (this.accuracyHistory.length > 1000) {
            this.accuracyHistory = this.accuracyHistory.slice(-1000);
        }

        console.log(`[AI Stats] ${field}: ${wasCorrect ? 'CORRECT' : 'INCORRECT'} prediction. New accuracy: ${(fieldStats.accuracy * 100).toFixed(1)}%`);
    }

    /**
     * Get overall system performance metrics
     * @returns {Object} Performance statistics
     */
    getSystemPerformance() {
        const recentHistory = this.accuracyHistory.slice(-100); // Last 100 predictions
        
        if (recentHistory.length === 0) {
            return {
                overallAccuracy: 0,
                totalPredictions: 0,
                recentAccuracy: 0,
                fieldAccuracies: this.fieldStatistics
            };
        }

        const correctRecent = recentHistory.filter(h => h.correct).length;
        const recentAccuracy = correctRecent / recentHistory.length;

        const totalCorrect = this.accuracyHistory.filter(h => h.correct).length;
        const overallAccuracy = totalCorrect / this.accuracyHistory.length;

        return {
            overallAccuracy: overallAccuracy,
            totalPredictions: this.accuracyHistory.length,
            recentAccuracy: recentAccuracy,
            fieldAccuracies: this.fieldStatistics,
            trend: this.calculateAccuracyTrend()
        };
    }

    /**
     * Calculate if accuracy is improving, declining, or stable
     * @returns {string} 'improving', 'declining', or 'stable'
     */
    calculateAccuracyTrend() {
        if (this.accuracyHistory.length < 20) return 'insufficient_data';

        const recent = this.accuracyHistory.slice(-20);
        const older = this.accuracyHistory.slice(-40, -20);

        if (older.length === 0) return 'insufficient_data';

        const recentAccuracy = recent.filter(h => h.correct).length / recent.length;
        const olderAccuracy = older.filter(h => h.correct).length / older.length;

        const difference = recentAccuracy - olderAccuracy;

        if (difference > 0.05) return 'improving';
        if (difference < -0.05) return 'declining';
        return 'stable';
    }

    /**
     * Get confidence threshold recommendation based on recent performance
     * @param {string} field - The tech field
     * @returns {number} Recommended confidence threshold
     */
    getRecommendedThreshold(field) {
        const fieldStats = this.fieldStatistics[field];
        if (!fieldStats || fieldStats.totalPredictions < 10) {
            return AI_CONFIG.MIN_CONFIDENCE; // Use default until we have enough data
        }

        // If accuracy is high, we can use lower thresholds
        if (fieldStats.accuracy > 0.8) {
            return Math.max(0.3, AI_CONFIG.MIN_CONFIDENCE - 0.1);
        }
        
        // If accuracy is low, use higher thresholds
        if (fieldStats.accuracy < 0.5) {
            return Math.min(0.8, AI_CONFIG.MIN_CONFIDENCE + 0.2);
        }

        return AI_CONFIG.MIN_CONFIDENCE;
    }

    /**
     * Analyze patterns to find the most reliable ones
     * @param {Array} patterns - Array of pattern objects
     * @returns {Array} Patterns sorted by reliability
     */
    analyzePatternReliability(patterns) {
        if (!patterns || patterns.length === 0) return [];

        // Score patterns based on frequency and accuracy
        const scoredPatterns = patterns.map(pattern => {
            const frequency = pattern.frequency || 1;
            const accuracy = pattern.accuracy || 0.5;
            const confidence = pattern.confidence || 0.5;
            
            // Combine metrics for overall reliability score
            const reliabilityScore = (frequency * 0.3) + (accuracy * 0.5) + (confidence * 0.2);
            
            return {
                ...pattern,
                reliabilityScore: reliabilityScore
            };
        });

        // Sort by reliability score (highest first)
        return scoredPatterns.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    }

    /**
     * Generate statistical report for debugging and analysis
     * @returns {Object} Detailed statistical report
     */
    generateDetailedReport() {
        const performance = this.getSystemPerformance();
        
        return {
            systemOverview: {
                totalPredictions: performance.totalPredictions,
                overallAccuracy: (performance.overallAccuracy * 100).toFixed(1) + '%',
                recentAccuracy: (performance.recentAccuracy * 100).toFixed(1) + '%',
                trend: performance.trend
            },
            fieldBreakdown: Object.keys(this.fieldStatistics).map(field => ({
                field: field,
                accuracy: (this.fieldStatistics[field].accuracy * 100).toFixed(1) + '%',
                totalPredictions: this.fieldStatistics[field].totalPredictions,
                recommendedThreshold: this.getRecommendedThreshold(field).toFixed(2),
                topValues: this.getTopValues(field, 3)
            })),
            recentPerformance: this.accuracyHistory.slice(-10).map(entry => ({
                field: entry.field,
                predicted: entry.predicted,
                actual: entry.actual,
                correct: entry.correct,
                confidence: entry.confidence.toFixed(2)
            }))
        };
    }

    /**
     * Get the most common values for a field
     * @param {string} field - The tech field
     * @param {number} limit - Maximum number of values to return
     * @returns {Array} Array of {value, count, percentage} objects
     */
    getTopValues(field, limit = 5) {
        const fieldStats = this.fieldStatistics[field];
        if (!fieldStats || !fieldStats.commonValues) return [];

        const values = Object.entries(fieldStats.commonValues)
            .map(([value, count]) => ({
                value: value,
                count: count,
                percentage: ((count / fieldStats.totalPredictions) * 100).toFixed(1) + '%'
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return values;
    }

    /**
     * Reset statistics (useful for testing or starting fresh)
     */
    resetStatistics() {
        this.accuracyHistory = [];
        AI_CONFIG.TECH_FIELDS.forEach(field => {
            this.fieldStatistics[field] = {
                totalPredictions: 0,
                correctPredictions: 0,
                accuracy: 0,
                commonValues: {},
                patternStrength: {}
            };
        });
        console.log('[AI Stats] Statistics reset successfully');
    }

    /**
     * Save statistics to database for persistence
     */
    async saveStatistics() {
        try {
            // Clean up field statistics for Firebase compatibility (remove empty string keys)
            const cleanedFieldStats = this.cleanFieldStatisticsForFirebase(this.fieldStatistics);
            
            await this.database.saveData('statistics', {
                fieldStatistics: cleanedFieldStats,
                accuracyHistory: this.accuracyHistory.slice(-500), // Save recent history only
                lastUpdated: Date.now()
            });
            console.log('[AI Stats] Statistics saved to database');
        } catch (error) {
            console.error('[AI Stats] Error saving statistics:', error);
        }
    }

    /**
     * Clean field statistics by removing empty string keys (Firebase doesn't support them)
     */
    cleanFieldStatisticsForFirebase(fieldStats) {
        const cleaned = {};
        
        for (const [field, stats] of Object.entries(fieldStats)) {
            cleaned[field] = {
                ...stats,
                commonValues: {}
            };
            
            // Only include non-empty string keys
            for (const [value, count] of Object.entries(stats.commonValues || {})) {
                if (value && value.trim() !== '') {
                    cleaned[field].commonValues[value] = count;
                }
            }
        }
        
        return cleaned;
    }

    /**
     * Load statistics from database
     */
    async loadStatistics() {
        try {
            const data = await this.database.loadData('statistics');
            if (data) {
                this.fieldStatistics = data.fieldStatistics || this.fieldStatistics;
                this.accuracyHistory = data.accuracyHistory || [];
                console.log('[AI Stats] Statistics loaded from database');
            }
        } catch (error) {
            console.error('[AI Stats] Error loading statistics:', error);
        }
    }
}
