// AI Configuration and Settings for Church Program Smart Assistant
// This file contains all the settings that control how the AI learns and operates

export const AI_CONFIG = {
    // Technical fields that the AI learns to predict
    TECH_FIELDS: ['camera', 'scene', 'mic', 'notes', 'stream'],
    
    // Learning behavior settings
    LEARNING: {
        // How confident the AI needs to be before auto-filling (0-1)
        MIN_CONFIDENCE_THRESHOLD: 0.75,
        
        // How many examples needed before AI starts making predictions
        MIN_EXAMPLES_REQUIRED: 5,
        
        // How much weight to give recent data vs old data (0-1, higher = more recent weight)
        RECENCY_WEIGHT: 0.7,
        
        // Maximum number of examples to store per pattern (to prevent bloat)
        MAX_EXAMPLES_PER_PATTERN: 100,
        
        // How often to clean up old/irrelevant data (days)
        CLEANUP_INTERVAL_DAYS: 30
    },
    
    // Text analysis settings
    TEXT_ANALYSIS: {
        // Words to ignore when analyzing patterns
        STOP_WORDS: ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
        
        // Minimum word length to consider significant
        MIN_WORD_LENGTH: 2,
        
        // How much similarity needed to consider two texts related (0-1)
        SIMILARITY_THRESHOLD: 0.6,
        
        // Keywords that are especially important for pattern matching
        IMPORTANT_KEYWORDS: [
            'sasb', 'sof', 'song', 'hymn', 'worship', 'prayer', 'reading', 'message', 
            'sermon', 'offering', 'announcement', 'band', 'piano', 'wg', 'worship group',
            'yp', 'young people', 'youth', 'video', 'presentation', 'benediction'
        ]
    },
    
    // Neural network settings
    NEURAL: {
        // Number of hidden layer nodes
        HIDDEN_NODES: 64,
        
        // Learning rate for training
        LEARNING_RATE: 0.01,
        
        // Training batch size
        BATCH_SIZE: 32,
        
        // Maximum training epochs
        MAX_EPOCHS: 100,
        
        // Early stopping threshold (when to stop training)
        EARLY_STOPPING_THRESHOLD: 0.01,
        
        // Regularization strength to prevent overfitting
        REGULARIZATION: 0.001
    },

    // Firebase database structure
    DATABASE: {
        // Main collection name in Firebase
        LEARNING_COLLECTION: 'aiLearningData',
        
        // Sub-collections for organization
        COLLECTIONS: {
            PATTERNS: 'patterns',
            STATISTICS: 'statistics',
            EXAMPLES: 'examples',
            METADATA: 'metadata'
        },
        
        // How often to sync with Firebase (milliseconds)
        SYNC_INTERVAL: 30000, // 30 seconds
        
        // Maximum retries for failed database operations
        MAX_RETRIES: 3
    },
    
    // Performance settings
    PERFORMANCE: {
        // Maximum time to wait for AI prediction (milliseconds)
        MAX_PREDICTION_TIME: 2000,
        
        // Maximum number of patterns to analyze at once
        MAX_PATTERNS_TO_ANALYZE: 50,
        
        // Enable caching of predictions to speed up repeated requests
        ENABLE_CACHING: true,
        
        // Cache expiry time (milliseconds)
        CACHE_EXPIRY: 300000 // 5 minutes
    },
    
    // Debugging and monitoring
    DEBUG: {
        // Enable detailed logging to console
        ENABLE_LOGGING: true,
        
        // Log levels: 'error', 'warn', 'info', 'debug'
        LOG_LEVEL: 'info',
        
        // Enable performance monitoring
        ENABLE_PERFORMANCE_TRACKING: true,
        
        // Show confidence scores in UI for debugging
        SHOW_CONFIDENCE_IN_UI: false
    },
    
    // Thresholds for transitioning between learning phases
    PHASE_THRESHOLDS: {
        PATTERN_LEARNING: 50,    // Start pattern learning after 50 examples
        NEURAL_LEARNING: 200,    // Start neural learning after 200 examples
        HYBRID_MODE: 100         // Enter hybrid mode after 100 examples
    },
    
    // Learning phases - how the AI evolves over time
    LEARNING_PHASES: {
        // Phase 1: Rule-based with basic learning (0-50 examples)
        RULE_BASED: {
            minExamples: 0,
            maxExamples: 50,
            aiWeight: 0.2,     // 20% AI, 80% hard-coded rules
            rulesWeight: 0.8,
            description: 'Learning basics, mostly using rules'
        },
        
        // Phase 2: Pattern learning begins (50-100 examples)
        PATTERN_LEARNING: {
            minExamples: 50,
            maxExamples: 100,
            aiWeight: 0.4,     // 40% AI, 60% rules
            rulesWeight: 0.6,
            description: 'Starting to learn patterns from data'
        },
        
        // Phase 3: Hybrid learning (100-200 examples)
        HYBRID: {
            minExamples: 100,
            maxExamples: 200,
            aiWeight: 0.6,     // 60% AI, 40% rules
            rulesWeight: 0.4,
            description: 'Balancing AI predictions with rules'
        },
        
        // Phase 4: Neural network primary (200+ examples)
        NEURAL_PRIMARY: {
            minExamples: 200,
            maxExamples: Infinity,
            aiWeight: 0.85,    // 85% AI, 15% rules
            rulesWeight: 0.15,
            description: 'Neural network as primary predictor'
        }
    }
};

// Field-specific learning configurations
export const FIELD_CONFIGS = {
    camera: {
        // Valid values for camera field
        validValues: ['1', '2', '3', '4'],
        
        // Default confidence required for this field
        minConfidence: 0.8,
        
        // Weight this field more heavily in learning (important field)
        importance: 1.0
    },
    
    scene: {
        validValues: ['1', '2', '3'],
        minConfidence: 0.75,
        importance: 0.8
    },
    
    mic: {
        // Mic has more complex values, so lower confidence threshold
        validValues: ['Amb', 'Lectern', 'Headset', 'Handheld', 'AV', '2', '3', '4', '2,3,4', '2/AV', '2/1'],
        minConfidence: 0.7,
        importance: 1.0
    },
    
    stream: {
        validValues: ['1', '2', ''],
        minConfidence: 0.6,
        importance: 0.6
    },
    
    notes: {
        // Notes are optional and highly variable
        validValues: [], // Any value allowed
        minConfidence: 0.5,
        importance: 0.3
    }
};

// Export helper functions
export function getCurrentLearningPhase(exampleCount) {
    // Determine which learning phase we're in based on number of examples
    for (const [phaseName, phase] of Object.entries(AI_CONFIG.LEARNING_PHASES)) {
        if (exampleCount >= phase.minExamples && exampleCount < phase.maxExamples) {
            return { name: phaseName, ...phase };
        }
    }
    return { name: 'NEURAL_PRIMARY', ...AI_CONFIG.LEARNING_PHASES.NEURAL_PRIMARY };
}

export function getFieldConfig(fieldName) {
    // Get configuration for a specific field
    return FIELD_CONFIGS[fieldName] || {
        validValues: [],
        minConfidence: 0.5,
        importance: 0.5
    };
}

export function shouldUseAI(exampleCount, confidence, fieldName) {
    // Decide whether to use AI prediction or fall back to rules
    const phase = getCurrentLearningPhase(exampleCount);
    const fieldConfig = getFieldConfig(fieldName);
    
    return confidence >= fieldConfig.minConfidence && 
           exampleCount >= AI_CONFIG.LEARNING.MIN_EXAMPLES_REQUIRED;
}
