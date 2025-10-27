// AI Learning Module - Main coordinator that ties all AI components together
// This is the central AI brain that coordinates pattern matching, statistics, neural networks,
// and database operations to provide intelligent auto-fill predictions

import { AI_CONFIG } from './ai-config.js';
import { AIDatabase } from './ai-database.js';
import { AIPatterns } from './ai-patterns.js';
import { AIStatistics } from './ai-statistics.js';
import { AINeural } from './ai-neural.js';

/**
 * AILearning - Main AI coordinator that combines all AI components
 * 
 * This class orchestrates the entire AI system:
 * - Manages learning phases (rule-based -> pattern matching -> neural network)
 * - Coordinates predictions from multiple AI components
 * - Handles user feedback and system improvement
 * - Provides unified interface for the main application
 */
export class AILearning {
    constructor() {
        this.database = new AIDatabase();
        this.patterns = new AIPatterns();
        this.statistics = new AIStatistics();
        this.neural = new AINeural();
        
        this.currentPhase = 'RULE_BASED';
        this.isInitialized = false;
        this.isLoading = false;
        
        // Performance tracking
        this.sessionStats = {
            totalPredictions: 0,
            correctPredictions: 0,
            userCorrections: 0,
            averageConfidence: 0
        };
        
        console.log('[AI Learning] Main AI coordinator initialized');
    }

    /**
     * Initialize the AI system - load data and set up components
     */
    async initialize() {
        if (this.isInitialized) return;
        
        this.isLoading = true;
        console.log('[AI Learning] Initializing AI system...');
        
        try {
            // Load saved data from database
            await this.loadSystemData();
            
            // Determine current learning phase based on available data
            await this.determineCurrentPhase();
            
            this.isInitialized = true;
            this.isLoading = false;
            
            console.log(`[AI Learning] AI system initialized successfully - Phase: ${this.currentPhase}`);
            
        } catch (error) {
            console.error('[AI Learning] Error initializing AI system:', error);
            this.isLoading = false;
            
            // Fall back to rule-based mode
            this.currentPhase = 'RULE_BASED';
            this.isInitialized = true;
        }
    }

    /**
     * Load all system data from database
     */
    async loadSystemData() {
        try {
            // Load in parallel for better performance
            await Promise.all([
                this.patterns.loadPatterns(),
                this.statistics.loadStatistics(),
                this.loadNeuralNetwork()
            ]);
            
            console.log('[AI Learning] System data loaded successfully');
            
        } catch (error) {
            console.warn('[AI Learning] Some data could not be loaded:', error);
        }
    }

    /**
     * Load neural network from database
     */
    async loadNeuralNetwork() {
        try {
            const networkData = await this.database.loadData('neural_network');
            if (networkData) {
                this.neural.deserialize(networkData);
                console.log('[AI Learning] Neural network loaded');
            }
        } catch (error) {
            console.warn('[AI Learning] Could not load neural network:', error);
        }
    }

    /**
     * Determine which learning phase we should be in based on available data
     */
    async determineCurrentPhase() {
        const systemPerf = this.statistics.getSystemPerformance();
        const hasPatterns = await this.patterns.getPatternCount() > 0;
        const hasNeuralData = this.neural.isInitialized;
        
        // Phase progression logic
        if (systemPerf.totalPredictions < AI_CONFIG.PHASE_THRESHOLDS.PATTERN_LEARNING) {
            this.currentPhase = 'RULE_BASED';
        } else if (systemPerf.totalPredictions < AI_CONFIG.PHASE_THRESHOLDS.NEURAL_LEARNING || !hasNeuralData) {
            this.currentPhase = 'PATTERN_LEARNING';
        } else if (systemPerf.overallAccuracy < 0.8) {
            this.currentPhase = 'HYBRID';
        } else {
            this.currentPhase = 'NEURAL_PRIMARY';
        }
        
        console.log(`[AI Learning] Determined phase: ${this.currentPhase} (${systemPerf.totalPredictions} predictions, ${(systemPerf.overallAccuracy * 100).toFixed(1)}% accuracy)`);
    }

    /**
     * Generate predictions for a program item
     * @param {Object} programItem - Program item with title, type, performer, etc.
     * @param {Object} context - Additional context (position in program, previous items, etc.)
     * @returns {Object} Predictions for all tech fields with confidence scores
     */
    async predict(programItem, context = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        console.log(`[AI Learning] Generating predictions for: "${programItem.title}" (Phase: ${this.currentPhase})`);
        
        let predictions = {};
        
        try {
            switch (this.currentPhase) {
                case 'RULE_BASED':
                    predictions = await this.predictRuleBased(programItem, context);
                    break;
                    
                case 'PATTERN_LEARNING':
                    predictions = await this.predictPatternBased(programItem, context);
                    break;
                    
                case 'HYBRID':
                    predictions = await this.predictHybrid(programItem, context);
                    break;
                    
                case 'NEURAL_PRIMARY':
                    predictions = await this.predictNeuralPrimary(programItem, context);
                    break;
                    
                default:
                    predictions = await this.predictRuleBased(programItem, context);
            }
            
            // Track session statistics
            this.sessionStats.totalPredictions++;
            const avgConf = this.calculateAverageConfidence(predictions);
            this.sessionStats.averageConfidence = 
                (this.sessionStats.averageConfidence * (this.sessionStats.totalPredictions - 1) + avgConf) / 
                this.sessionStats.totalPredictions;
            
            console.log(`[AI Learning] Predictions generated with average confidence: ${avgConf.toFixed(2)}`);
            return predictions;
            
        } catch (error) {
            console.error('[AI Learning] Error generating predictions:', error);
            return this.getEmptyPredictions();
        }
    }

    /**
     * Rule-based predictions (original auto-fill logic)
     * @param {Object} programItem - Program item
     * @param {Object} context - Additional context
     * @returns {Object} Rule-based predictions
     */
    async predictRuleBased(programItem, context) {
        // Import the original auto-fill logic
        // For now, return basic predictions that can be enhanced
        const predictions = {};
        
        AI_CONFIG.TECH_FIELDS.forEach(field => {
            predictions[field] = {
                value: '',
                confidence: 0.3, // Low confidence for rule-based
                source: 'rule-based',
                explanation: 'Based on hard-coded rules'
            };
        });
        
        // Basic rule-based logic for common patterns
        const title = (programItem.title || '').toLowerCase();
        const performer = (programItem.performer || '').toLowerCase();
        
        // Microphone logic
        if (performer.includes('piano') || performer.includes('organ')) {
            predictions.mic.value = 'N/A';
            predictions.mic.confidence = 0.8;
        } else if (performer || title.includes('song') || title.includes('hymn')) {
            predictions.mic.value = 'ON';
            predictions.mic.confidence = 0.6;
        }
        
        // Stream logic
        if (title.includes('prayer') || title.includes('closing') || title.includes('benediction')) {
            predictions.stream.value = 'OFF';
            predictions.stream.confidence = 0.7;
        }
        
        return predictions;
    }

    /**
     * Pattern-based predictions using learned patterns
     * @param {Object} programItem - Program item
     * @param {Object} context - Additional context
     * @returns {Object} Pattern-based predictions
     */
    async predictPatternBased(programItem, context) {
        const predictions = {};
        
        for (const field of AI_CONFIG.TECH_FIELDS) {
            try {
                const matchingPatterns = await this.patterns.findMatchingPatterns(programItem, field);
                
                if (matchingPatterns.length > 0) {
                    // Use the best matching pattern
                    const bestPattern = matchingPatterns[0];
                    const confidence = this.statistics.calculateConfidence(
                        { [field]: bestPattern.techValues[field] },
                        matchingPatterns,
                        field
                    );
                    
                    predictions[field] = {
                        value: bestPattern.techValues[field] || '',
                        confidence: confidence,
                        source: 'pattern-matching',
                        explanation: `Based on ${matchingPatterns.length} similar patterns`,
                        patternCount: matchingPatterns.length
                    };
                } else {
                    // Fall back to rule-based for this field
                    const ruleBased = await this.predictRuleBased(programItem, context);
                    predictions[field] = {
                        ...ruleBased[field],
                        source: 'rule-based-fallback'
                    };
                }
            } catch (error) {
                console.error(`[AI Learning] Error predicting ${field}:`, error);
                // Record last error for diagnostics/status reporting
                try { this.lastError = error; this.lastErrorAt = Date.now(); } catch (e) {}
                predictions[field] = {
                    value: '',
                    confidence: 0,
                    source: 'error',
                    explanation: 'Prediction failed'
                };
            }
        }
        
        return predictions;
    }

    /**
     * Hybrid predictions combining patterns and neural network
     * @param {Object} programItem - Program item
     * @param {Object} context - Additional context
     * @returns {Object} Hybrid predictions
     */
    async predictHybrid(programItem, context) {
        try {
            // Get predictions from both methods
            const patternPredictions = await this.predictPatternBased(programItem, context);
            const neuralPredictions = this.neural.predict(programItem);
            
            const hybridPredictions = {};
            
            for (const field of AI_CONFIG.TECH_FIELDS) {
                const patternPred = patternPredictions[field];
                const neuralPred = neuralPredictions[field];
                
                // Combine confidences - neural network acts as a confidence modifier
                let combinedConfidence = patternPred.confidence;
                if (neuralPred && neuralPred.neuralConfidence) {
                    combinedConfidence = (patternPred.confidence * 0.7) + (neuralPred.neuralConfidence * 0.3);
                }
                
                hybridPredictions[field] = {
                    value: patternPred.value,
                    confidence: combinedConfidence,
                    source: 'hybrid',
                    explanation: `Combined pattern matching and neural network`,
                    patternConfidence: patternPred.confidence,
                    neuralConfidence: neuralPred ? neuralPred.neuralConfidence : 0
                };
            }
            
            return hybridPredictions;
            
        } catch (error) {
            console.error('[AI Learning] Error in hybrid prediction:', error);
            return await this.predictPatternBased(programItem, context);
        }
    }

    /**
     * Neural network primary predictions
     * @param {Object} programItem - Program item
     * @param {Object} context - Additional context
     * @returns {Object} Neural network predictions
     */
    async predictNeuralPrimary(programItem, context) {
        try {
            const neuralPredictions = this.neural.predict(programItem);
            const patternPredictions = await this.predictPatternBased(programItem, context);
            
            const finalPredictions = {};
            
            for (const field of AI_CONFIG.TECH_FIELDS) {
                const neuralPred = neuralPredictions[field];
                const patternPred = patternPredictions[field];
                
                // Use neural confidence, but pattern values for now
                // Eventually the neural network will predict actual values too
                finalPredictions[field] = {
                    value: patternPred.value,
                    confidence: neuralPred ? neuralPred.neuralConfidence : patternPred.confidence,
                    source: 'neural-primary',
                    explanation: `Neural network with pattern fallback`,
                    neuralConfidence: neuralPred ? neuralPred.neuralConfidence : 0,
                    patternConfidence: patternPred.confidence
                };
            }
            
            return finalPredictions;
            
        } catch (error) {
            console.error('[AI Learning] Error in neural prediction:', error);
            return await this.predictHybrid(programItem, context);
        }
    }

    /**
     * Learn from user corrections and feedback
     * @param {Object} programItem - Original program item
     * @param {Object} aiPredictions - What the AI predicted
     * @param {Object} userValues - What the user actually chose
     * @param {Object} context - Additional context
     */
    async learnFromFeedback(programItem, aiPredictions, userValues, context = {}) {
        console.log('[AI Learning] Learning from user feedback');
        
        try {
            // Update statistics for each field
            for (const field of AI_CONFIG.TECH_FIELDS) {
                const predicted = aiPredictions[field]?.value || '';
                const actual = userValues[field] || '';
                const confidence = aiPredictions[field]?.confidence || 0;
                
                this.statistics.updatePredictionStats(field, predicted, actual, confidence);
                
                // Track session corrections
                if (predicted !== actual) {
                    this.sessionStats.userCorrections++;
                } else {
                    this.sessionStats.correctPredictions++;
                }
            }
            
            // Update session stats
            this.sessionStats.totalPredictions++;
            
            // Save new pattern
            await this.patterns.addPattern(programItem, userValues, context);
            
            // Train neural network if in appropriate phase
            if (this.currentPhase === 'HYBRID' || 
                this.currentPhase === 'NEURAL_PRIMARY') {
                this.neural.trainSingle(programItem, userValues);
            }
            
            // Check if we should advance to next learning phase
            await this.checkPhaseAdvancement();
            
            // Save data after every learning session (for immediate Firebase storage)
            await this.saveSystemData();
            
            console.log('[AI Learning] Learning completed successfully');
            
        } catch (error) {
            console.error('[AI Learning] Error during learning:', error);
        }
    }

    /**
     * Check if we should advance to the next learning phase
     */
    async checkPhaseAdvancement() {
        const systemPerf = this.statistics.getSystemPerformance();
        const currentPhase = this.currentPhase;
        
        // Advancement criteria
        if (this.currentPhase === 'RULE_BASED' &&
            systemPerf.totalPredictions >= AI_CONFIG.PHASE_THRESHOLDS.PATTERN_LEARNING) {
            this.currentPhase = 'PATTERN_LEARNING';
            console.log('[AI Learning] Advanced to PATTERN_LEARNING phase');
        }
        
        else if (this.currentPhase === 'PATTERN_LEARNING' &&
                 systemPerf.totalPredictions >= AI_CONFIG.PHASE_THRESHOLDS.NEURAL_LEARNING &&
                 systemPerf.overallAccuracy > 0.6) {
            this.currentPhase = 'HYBRID';
            console.log('[AI Learning] Advanced to HYBRID phase');
            
            // Initialize neural network training
            await this.initializeNeuralTraining();
        }
        
        else if (this.currentPhase === 'HYBRID' &&
                 systemPerf.totalPredictions >= 300 &&  // Use a fixed threshold since AUTONOMOUS doesn't exist
                 systemPerf.overallAccuracy > 0.8) {
            this.currentPhase = 'NEURAL_PRIMARY';
            console.log('[AI Learning] Advanced to NEURAL_PRIMARY phase');
        }
        
        // If phase changed, save the new state
        if (currentPhase !== this.currentPhase) {
            await this.saveSystemData();
        }
    }

    /**
     * Initialize neural network training with existing patterns
     */
    async initializeNeuralTraining() {
        try {
            console.log('[AI Learning] Initializing neural network training...');
            
            const allPatterns = await this.patterns.getAllPatterns();
            
            if (allPatterns.length > 0) {
                // Convert patterns to training examples
                const trainingExamples = allPatterns.map(pattern => ({
                    input: pattern.programItem,
                    target: pattern.techValues
                }));
                
                // Build vocabulary for feature encoding
                this.neural.featureEncoder.buildVocabulary(allPatterns.map(p => p.programItem));
                
                // Train the network
                this.neural.trainBatch(trainingExamples, 20);
                
                console.log(`[AI Learning] Neural network trained with ${trainingExamples.length} examples`);
            }
            
        } catch (error) {
            console.error('[AI Learning] Error initializing neural training:', error);
        }
    }

    /**
     * Save all system data to database
     */
    async saveSystemData() {
        try {
            console.log('[AI Learning] Saving system data...');
            
            await Promise.all([
                this.patterns.savePatterns(),
                this.statistics.saveStatistics(),
                this.saveNeuralNetwork(),
                this.saveSystemState()
            ]);
            
            console.log('[AI Learning] System data saved successfully');
            
        } catch (error) {
            console.error('[AI Learning] Error saving system data:', error);
        }
    }

    /**
     * Save neural network to database
     */
    async saveNeuralNetwork() {
        try {
            const networkData = this.neural.serialize();
            if (networkData) {
                await this.database.saveData('neural_network', networkData);
            }
        } catch (error) {
            console.error('[AI Learning] Error saving neural network:', error);
        }
    }

    /**
     * Save system state information
     */
    async saveSystemState() {
        try {
            const systemState = {
                currentPhase: this.currentPhase,
                sessionStats: this.sessionStats,
                lastUpdated: Date.now()
            };
            
            await this.database.saveData('system_state', systemState);
        } catch (error) {
            console.error('[AI Learning] Error saving system state:', error);
        }
    }

    /**
     * Get current system status and performance
     * @returns {Object} Detailed system status
     */
    getSystemStatus() {
        try {
            const systemPerf = this.statistics ? this.statistics.getSystemPerformance() : {
                overallAccuracy: 0,
                totalPredictions: 0,
                recentAccuracy: 0,
                fieldAccuracies: {}
            };
            
            return {
                isInitialized: this.isInitialized,
                isLoading: this.isLoading,
                currentPhase: this.currentPhase,
                performance: systemPerf,
                sessionStats: this.sessionStats || {
                    totalPredictions: 0,
                    correctPredictions: 0,
                    userCorrections: 0,
                    averageConfidence: 0
                },
                phaseProgress: this.calculatePhaseProgress(),
                nextPhaseRequirements: this.getNextPhaseRequirements()
            };
        } catch (error) {
            console.error('[AI Learning] Error getting system status:', error);
            return {
                isInitialized: false,
                isLoading: false,
                currentPhase: 'RULE_BASED',
                performance: {
                    overallAccuracy: 0,
                    totalPredictions: 0,
                    recentAccuracy: 0,
                    fieldAccuracies: {}
                },
                sessionStats: {
                    totalPredictions: 0,
                    correctPredictions: 0,
                    userCorrections: 0,
                    averageConfidence: 0
                },
                phaseProgress: { current: 0, required: 50, percentage: 0 },
                nextPhaseRequirements: { nextPhase: 'Pattern Learning', predictions: 50, description: 'Starting phase' }
            };
        }
    }

    /**
     * Calculate progress toward next phase
     * @returns {Object} Progress information
     */
    calculatePhaseProgress() {
        try {
            const systemPerf = this.statistics ? this.statistics.getSystemPerformance() : { totalPredictions: 0 };
            const total = systemPerf.totalPredictions || 0;
            
            switch (this.currentPhase) {
                case 'RULE_BASED':
                    return {
                        current: total,
                        required: AI_CONFIG.LEARNING_PHASES.PATTERN_LEARNING.minExamples,
                        percentage: Math.min(100, (total / AI_CONFIG.LEARNING_PHASES.PATTERN_LEARNING.minExamples) * 100)
                    };
                    
                case 'PATTERN_LEARNING':
                    return {
                        current: total,
                        required: AI_CONFIG.LEARNING_PHASES.HYBRID.minExamples,
                        percentage: Math.min(100, (total / AI_CONFIG.LEARNING_PHASES.HYBRID.minExamples) * 100)
                    };
                    
                case 'HYBRID':
                    return {
                        current: total,
                        required: AI_CONFIG.LEARNING_PHASES.NEURAL_PRIMARY.minExamples,
                        percentage: Math.min(100, (total / AI_CONFIG.LEARNING_PHASES.NEURAL_PRIMARY.minExamples) * 100)
                    };
                    
                case 'NEURAL_PRIMARY':
                    return {
                        current: total,
                        required: total,
                        percentage: 100
                    };
                    
                default:
                    return { current: total, required: 50, percentage: 0, phase: 'unknown' };
            }
        } catch (error) {
            console.error('[AI Learning] Error calculating phase progress:', error);
            return { current: 0, required: 50, percentage: 0, phase: 'error' };
        }
    }

    /**
     * Get requirements for advancing to next phase
     * @returns {Object} Requirements information
     */
    getNextPhaseRequirements() {
        switch (this.currentPhase) {
            case 'RULE_BASED':
                return {
                    nextPhase: 'Pattern Learning',
                    predictions: AI_CONFIG.PHASE_THRESHOLDS.PATTERN_LEARNING,
                    description: 'Collect enough user data to start learning patterns'
                };
                
            case 'PATTERN_LEARNING':
                return {
                    nextPhase: 'Hybrid AI',
                    predictions: AI_CONFIG.PHASE_THRESHOLDS.NEURAL_LEARNING,
                    accuracy: '60%',
                    description: 'Achieve good pattern recognition to enable neural network training'
                };
                
            case 'HYBRID':
                return {
                    nextPhase: 'Autonomous AI',
                    predictions: 300, // Fixed threshold
                    accuracy: '80%',
                    description: 'Achieve high accuracy for fully autonomous operation'
                };
                
            default:
                return {
                    nextPhase: 'Complete',
                    description: 'AI system is fully autonomous and continuously learning'
                };
        }
    }

    /**
     * Generate detailed report for debugging and analysis
     * @returns {Object} Comprehensive system report
     */
    generateDetailedReport() {
        return {
            systemStatus: this.getSystemStatus(),
            statisticsReport: this.statistics.generateDetailedReport(),
            patterns: {
                totalPatterns: this.patterns.getPatternCount(),
                // Add more pattern analysis here
            },
            neuralNetwork: {
                isInitialized: this.neural.isInitialized,
                // Add network architecture info here
            },
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * Generate recommendations for improving AI performance
     * @returns {Array} Array of recommendation objects
     */
    generateRecommendations() {
        const recommendations = [];
        const systemPerf = this.statistics.getSystemPerformance();
        
        if (systemPerf.overallAccuracy < 0.5) {
            recommendations.push({
                type: 'accuracy',
                severity: 'high',
                message: 'Overall accuracy is below 50%. Consider reviewing prediction logic.',
                action: 'Review and improve pattern matching algorithms'
            });
        }
        
        if (systemPerf.totalPredictions < 50) {
            recommendations.push({
                type: 'data',
                severity: 'medium',
                message: 'More training data needed for better AI performance.',
                action: 'Continue using the system to provide more learning examples'
            });
        }
        
        if (systemPerf.trend === 'declining') {
            recommendations.push({
                type: 'performance',
                severity: 'medium',
                message: 'AI performance is declining. System may need retraining.',
                action: 'Consider resetting neural network or reviewing recent patterns'
            });
        }
        
        return recommendations;
    }

    /**
     * Helper function to calculate average confidence
     * @param {Object} predictions - Predictions object
     * @returns {number} Average confidence
     */
    calculateAverageConfidence(predictions) {
        const confidences = Object.values(predictions)
            .map(p => p.confidence || 0)
            .filter(c => c > 0);
            
        if (confidences.length === 0) return 0;
        
        return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    /**
     * Helper function to get empty predictions
     * @returns {Object} Empty predictions for all fields
     */
    getEmptyPredictions() {
        const predictions = {};
        AI_CONFIG.TECH_FIELDS.forEach(field => {
            predictions[field] = {
                value: '',
                confidence: 0,
                source: 'error',
                explanation: 'Prediction failed'
            };
        });
        return predictions;
    }
}
