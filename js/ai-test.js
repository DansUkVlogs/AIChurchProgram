// AI System Test Script - Simple validation of all AI modules
// This script tests the basic functionality of all AI components to ensure they work together

import { AI_CONFIG } from './ai-config.js';
import { AIDatabase } from './ai-database.js';
import { AIPatterns } from './ai-patterns.js';
import { AIStatistics } from './ai-statistics.js';
import { AINeural } from './ai-neural.js';
import { AILearning } from './ai-learning.js';

/**
 * Simple test suite for the AI system
 * This helps ensure all modules are working correctly and can communicate with each other
 */
class AITestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('[AI Test] Starting AI system test suite...');
        
        // Test individual modules
        await this.testConfig();
        await this.testDatabase();
        await this.testPatterns();
        await this.testStatistics();
        await this.testNeural();
        await this.testLearning();
        
        // Test integration
        await this.testIntegration();
        
        this.printResults();
        return this.generateReport();
    }

    /**
     * Test AI configuration
     */
    async testConfig() {
        this.startTest('AI Configuration');
        
        try {
            // Test that all required fields are present
            this.assert(Array.isArray(AI_CONFIG.TECH_FIELDS), 'TECH_FIELDS should be an array');
            this.assert(AI_CONFIG.TECH_FIELDS.length > 0, 'TECH_FIELDS should not be empty');
            this.assert(typeof AI_CONFIG.MIN_CONFIDENCE === 'number', 'MIN_CONFIDENCE should be a number');
            this.assert(AI_CONFIG.MIN_CONFIDENCE >= 0 && AI_CONFIG.MIN_CONFIDENCE <= 1, 'MIN_CONFIDENCE should be between 0 and 1');
            
            // Test learning phases
            const phases = Object.values(AI_CONFIG.LEARNING_PHASES);
            this.assert(phases.length >= 4, 'Should have at least 4 learning phases');
            
            // Test helper functions
            this.assert(typeof AI_CONFIG.isValidField === 'function', 'isValidField should be a function');
            this.assert(AI_CONFIG.isValidField('camera'), 'camera should be a valid field');
            this.assert(!AI_CONFIG.isValidField('invalid'), 'invalid should not be a valid field');
            
            this.passTest('AI Configuration tests passed');
            
        } catch (error) {
            this.failTest('AI Configuration', error);
        }
    }

    /**
     * Test database functionality
     */
    async testDatabase() {
        this.startTest('AI Database');
        
        try {
            const db = new AIDatabase();
            
            // Test basic operations
            const testData = { test: 'data', timestamp: Date.now() };
            await db.saveData('test_key', testData);
            
            const loadedData = await db.loadData('test_key');
            this.assert(loadedData.test === 'data', 'Data should be saved and loaded correctly');
            
            // Test status
            const status = db.getStatus();
            this.assert(typeof status.isOnline === 'boolean', 'Status should include isOnline');
            
            // Clean up
            await db.deleteData('test_key');
            
            this.passTest('Database tests passed');
            
        } catch (error) {
            this.failTest('AI Database', error);
        }
    }

    /**
     * Test pattern matching
     */
    async testPatterns() {
        this.startTest('AI Patterns');
        
        try {
            const patterns = new AIPatterns();
            
            // Test adding patterns
            const testProgramItem = {
                title: 'Test Song SOF 123',
                type: 'song',
                performer: 'piano'
            };
            
            const testTechValues = {
                camera: '3',
                scene: '1',
                mic: 'Amb',
                stream: '1'
            };
            
            await patterns.addPattern(testProgramItem, testTechValues);
            
            // Test finding patterns
            const matchingPatterns = await patterns.findMatchingPatterns(testProgramItem, 'camera');
            this.assert(Array.isArray(matchingPatterns), 'Should return array of patterns');
            
            // Test similarity calculation
            const similarity = patterns.calculateSimilarity('test song', 'test song sof 123');
            this.assert(typeof similarity === 'number', 'Similarity should be a number');
            this.assert(similarity >= 0 && similarity <= 1, 'Similarity should be between 0 and 1');
            
            this.passTest('Pattern matching tests passed');
            
        } catch (error) {
            this.failTest('AI Patterns', error);
        }
    }

    /**
     * Test statistics
     */
    async testStatistics() {
        this.startTest('AI Statistics');
        
        try {
            const stats = new AIStatistics();
            
            // Test prediction stats update
            stats.updatePredictionStats('camera', '3', '3', 0.8);
            stats.updatePredictionStats('camera', '2', '3', 0.6);
            
            // Test performance metrics
            const performance = stats.getSystemPerformance();
            this.assert(typeof performance.overallAccuracy === 'number', 'Should return overall accuracy');
            this.assert(typeof performance.totalPredictions === 'number', 'Should return total predictions');
            
            // Test confidence calculation
            const testPrediction = { camera: '3' };
            const testPatterns = [{ similarity: 0.8, confidence: 0.7 }];
            const confidence = stats.calculateConfidence(testPrediction, testPatterns, 'camera');
            this.assert(typeof confidence === 'number', 'Confidence should be a number');
            
            this.passTest('Statistics tests passed');
            
        } catch (error) {
            this.failTest('AI Statistics', error);
        }
    }

    /**
     * Test neural network
     */
    async testNeural() {
        this.startTest('AI Neural Network');
        
        try {
            const neural = new AINeural();
            
            // Test basic prediction (should work even without training)
            const testItem = {
                title: 'Test Song',
                type: 'song',
                performer: 'piano'
            };
            
            const predictions = neural.predict(testItem);
            this.assert(typeof predictions === 'object', 'Should return predictions object');
            
            // Test feature encoding
            const encoder = neural.featureEncoder;
            const features = encoder.encode(testItem);
            this.assert(Array.isArray(features), 'Should return feature array');
            this.assert(features.length > 0, 'Feature array should not be empty');
            
            // Test serialization
            const serialized = neural.serialize();
            // Note: serialized might be null if network isn't initialized, which is okay
            
            this.passTest('Neural network tests passed');
            
        } catch (error) {
            this.failTest('AI Neural Network', error);
        }
    }

    /**
     * Test main learning coordinator
     */
    async testLearning() {
        this.startTest('AI Learning Coordinator');
        
        try {
            const learning = new AILearning();
            
            // Test initialization
            await learning.initialize();
            this.assert(learning.isInitialized, 'Should be initialized after setup');
            
            // Test prediction (basic functionality)
            const testItem = {
                title: 'Test Hymn SOF 456',
                type: 'song',
                performer: 'congregation'
            };
            
            const predictions = await learning.predict(testItem);
            this.assert(typeof predictions === 'object', 'Should return predictions object');
            
            // Test that all tech fields are covered
            for (const field of AI_CONFIG.TECH_FIELDS) {
                this.assert(predictions[field] !== undefined, `Should have prediction for ${field}`);
                this.assert(typeof predictions[field].confidence === 'number', `${field} should have confidence score`);
            }
            
            // Test system status
            const status = learning.getSystemStatus();
            this.assert(typeof status.currentPhase === 'string', 'Should have current phase');
            this.assert(typeof status.isInitialized === 'boolean', 'Should have initialization status');
            
            this.passTest('Learning coordinator tests passed');
            
        } catch (error) {
            this.failTest('AI Learning Coordinator', error);
        }
    }

    /**
     * Test integration between modules
     */
    async testIntegration() {
        this.startTest('Module Integration');
        
        try {
            const learning = new AILearning();
            await learning.initialize();
            
            // Test full prediction and learning cycle
            const programItem = {
                title: 'Opening Song SOF 789',
                type: 'song',
                performer: 'worship group'
            };
            
            // Get initial predictions
            const initialPredictions = await learning.predict(programItem);
            
            // Simulate user corrections
            const userValues = {
                camera: '2',
                scene: '1',
                mic: '2,3,4',
                stream: '1'
            };
            
            // Learn from feedback
            await learning.learnFromFeedback(programItem, initialPredictions, userValues);
            
            // Test that system learned (stats should be updated)
            const systemStatus = learning.getSystemStatus();
            this.assert(systemStatus.performance.totalPredictions > 0, 'Should have recorded predictions');
            
            this.passTest('Integration tests passed');
            
        } catch (error) {
            this.failTest('Module Integration', error);
        }
    }

    /**
     * Helper methods for testing
     */
    startTest(testName) {
        this.currentTest = testName;
        this.totalTests++;
        console.log(`[AI Test] Running: ${testName}`);
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    passTest(message) {
        this.passedTests++;
        this.testResults.push({
            test: this.currentTest,
            status: 'PASS',
            message: message
        });
        console.log(`[AI Test] ✓ ${this.currentTest}: ${message}`);
    }

    failTest(testName, error) {
        this.testResults.push({
            test: testName,
            status: 'FAIL',
            message: error.message,
            error: error
        });
        console.error(`[AI Test] ✗ ${testName}: ${error.message}`);
    }

    printResults() {
        console.log('\n[AI Test] ========================================');
        console.log(`[AI Test] Test Results: ${this.passedTests}/${this.totalTests} passed`);
        console.log('[AI Test] ========================================');
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✓' : '✗';
            console.log(`[AI Test] ${icon} ${result.test}: ${result.message}`);
        });
        
        console.log('[AI Test] ========================================\n');
    }

    generateReport() {
        return {
            totalTests: this.totalTests,
            passedTests: this.passedTests,
            failedTests: this.totalTests - this.passedTests,
            successRate: (this.passedTests / this.totalTests * 100).toFixed(1),
            results: this.testResults,
            summary: `${this.passedTests}/${this.totalTests} tests passed (${(this.passedTests / this.totalTests * 100).toFixed(1)}%)`
        };
    }
}

// Export for use in development/debugging
export { AITestSuite };

// Auto-run basic tests if this module is imported directly
if (typeof window !== 'undefined' && window.location.search.includes('test=ai')) {
    console.log('[AI Test] Auto-running AI tests...');
    const testSuite = new AITestSuite();
    testSuite.runAllTests().then(report => {
        console.log('[AI Test] All tests completed:', report.summary);
        
        // Make results available globally for debugging
        window.aiTestResults = report;
    }).catch(error => {
        console.error('[AI Test] Test suite failed:', error);
    });
}
