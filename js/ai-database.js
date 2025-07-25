// Firebase Database Operations for AI Learning System
// This file handles all communication with Firebase to store and retrieve learning data

import { AI_CONFIG } from './ai-config.js';
import { loadFirebaseOnce } from './firebase-loader.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDwfoIJYf6kdq4HU6O7kxIIgz3bsNB9O0",
  authDomain: "churchaiprogram.firebaseapp.com",
  projectId: "churchaiprogram",
  storageBucket: "churchaiprogram.firebasestorage.app",
  messagingSenderId: "205890425005",
  appId: "1:205890425005:web:633b4fc61f5e14b5e17624",
  measurementId: "G-5T5Q3LPCC6"
};

// Firebase state
let db = null;
let isFirebaseInitialized = false;
let isInitializing = false; // Prevent multiple simultaneous initializations

// Initialize Firebase connection
export async function initializeDatabase() {
    // Prevent multiple initializations
    if (isFirebaseInitialized) {
        return true;
    }
    
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing) {
        // Wait for the current initialization to complete
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return isFirebaseInitialized;
    }
    
    isInitializing = true;
    
    try {
        // Load Firebase SDK using the global loader
        const firebase = await loadFirebaseOnce();
        
        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Get Firestore database reference
        db = firebase.firestore();
        
        // Test the connection by trying to read the system info
        await testFirebaseConnection();
        
        isFirebaseInitialized = true;
        isInitializing = false;
        console.log('✅ Firebase initialized and tested successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.warn('AI learning will use local storage only.');
        isInitializing = false;
        return false;
    }
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        // Try to read a test document
        const testDoc = await db.collection('ai_data').doc('system_info').get();
        
        if (!testDoc.exists) {
            // Create the system info document if it doesn't exist
            await db.collection('ai_data').doc('system_info').set({
                initialized: true,
                created: new Date(),
                version: '1.0',
                lastTest: new Date()
            });
            console.log('📝 Created system info document');
        } else {
            // Update last test time
            await db.collection('ai_data').doc('system_info').update({
                lastTest: new Date()
            });
            console.log('🔄 Updated system info document');
        }
        
        console.log('🔗 Firebase connection test successful');
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        throw error; // Re-throw to be caught by initializeDatabase
    }
}

/**
 * AIDatabase - Simplified database operations for the AI learning system
 * Handles both Firebase (cloud) and localStorage (local) storage
 */
export class AIDatabase {
    constructor() {
        this.isOnline = false;
        this.initialize();
    }

    /**
     * Initialize the database connection
     */
    async initialize() {
        this.isOnline = await initializeDatabase();
        return this.isOnline;
    }

    /**
     * Save data with automatic Firebase/localStorage fallback
     */
    async saveData(key, data) {
        try {
            const timestamp = new Date().toISOString();
            const dataWithMeta = {
                ...data,
                lastUpdated: timestamp,
                source: 'ai-system'
            };

            // Try Firebase first
            if (isFirebaseInitialized && db) {
                try {
                    await db.collection('ai_data')
                        .doc(key)
                        .set(dataWithMeta);
                    console.log(`💾 Saved to Firebase: ${key}`);
                    return true; // Firebase success
                } catch (firebaseError) {
                    console.warn(`⚠️ Firebase save failed for ${key}:`, firebaseError.message);
                    // Continue to localStorage fallback
                }
            }

            // Fallback to localStorage
            localStorage.setItem(`ai_${key}`, JSON.stringify(dataWithMeta));
            console.log(`💾 Saved to localStorage: ${key}`);
            return false; // Fallback used (not Firebase)

        } catch (error) {
            console.error(`❌ Error saving ${key}:`, error);
            // Last resort - try localStorage without metadata
            try {
                localStorage.setItem(`ai_${key}`, JSON.stringify(data));
                return false; // Fallback used
            } catch (localError) {
                console.error(`❌ Complete save failure for ${key}:`, localError);
                return false;
            }
        }
    }

    /**
     * Load data with automatic Firebase/localStorage fallback
     */
    async loadData(key) {
        try {
            // Try Firebase first
            if (isFirebaseInitialized && db) {
                const doc = await db.collection('ai_data')
                    .doc(key)
                    .get();
                
                if (doc.exists) {
                    console.log(`📚 Loaded from Firebase: ${key}`);
                    return doc.data();
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem(`ai_${key}`);
            if (localData) {
                console.log(`📚 Loaded from localStorage: ${key}`);
                return JSON.parse(localData);
            }

            return null;

        } catch (error) {
            console.error(`❌ Error loading ${key}:`, error);
            
            // Try localStorage as last resort
            try {
                const localData = localStorage.getItem(`ai_${key}`);
                return localData ? JSON.parse(localData) : null;
            } catch (localError) {
                console.error(`❌ Error loading from localStorage: ${key}`, localError);
                return null;
            }
        }
    }

    /**
     * Delete data
     */
    async deleteData(key) {
        try {
            // Delete from Firebase
            if (isFirebaseInitialized && db) {
                await db.collection('ai_data')
                    .doc(key)
                    .delete();
            }

            // Delete from localStorage
            localStorage.removeItem(`ai_${key}`);
            
            console.log(`🗑️ Deleted: ${key}`);

        } catch (error) {
            console.error(`❌ Error deleting ${key}:`, error);
        }
    }

    /**
     * Get database status
     */
    getStatus() {
        return {
            isOnline: isFirebaseInitialized,
            hasLocalStorage: typeof Storage !== 'undefined',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Save learning pattern
     */
    async savePattern(pattern) {
        const key = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.saveData(key, {
            type: 'pattern',
            data: pattern,
            created: new Date().toISOString()
        });
        return key;
    }

    /**
     * Load all patterns
     */
    async loadPatterns() {
        try {
            const patterns = [];
            
            // Try Firebase first
            if (isFirebaseInitialized && db) {
                const snapshot = await db.collection('ai_data')
                    .where('type', '==', 'pattern')
                    .orderBy('created', 'desc')
                    .limit(500)
                    .get();
                
                snapshot.forEach(doc => {
                    patterns.push(doc.data().data);
                });
            }
            
            // Merge with localStorage patterns
            const localPatterns = this.loadLocalPatterns();
            patterns.push(...localPatterns);
            
            return patterns;
            
        } catch (error) {
            console.error('❌ Error loading patterns:', error);
            return this.loadLocalPatterns();
        }
    }

    /**
     * Load patterns from localStorage
     */
    loadLocalPatterns() {
        try {
            const stored = localStorage.getItem('ai_patterns');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Error loading local patterns:', error);
            return [];
        }
    }

    /**
     * Save patterns to localStorage
     */
    saveLocalPatterns(patterns) {
        try {
            localStorage.setItem('ai_patterns', JSON.stringify(patterns));
        } catch (error) {
            console.error('❌ Error saving local patterns:', error);
        }
    }

    /**
     * Test and diagnose Firebase connection issues
     */
    async diagnoseConnection() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            tests: [],
            recommendations: []
        };

        // Test 1: Check if Firebase SDK is loaded
        diagnosis.tests.push({
            name: 'Firebase SDK Loading',
            status: typeof firebase !== 'undefined' ? 'PASS' : 'FAIL',
            details: typeof firebase !== 'undefined' ? 'Firebase SDK loaded' : 'Firebase SDK not loaded'
        });

        // Test 2: Check if app is initialized
        if (typeof firebase !== 'undefined') {
            diagnosis.tests.push({
                name: 'Firebase App Initialization',
                status: firebase.apps.length > 0 ? 'PASS' : 'FAIL',
                details: firebase.apps.length > 0 ? `${firebase.apps.length} app(s) initialized` : 'No Firebase apps initialized'
            });
        }

        // Test 3: Check if Firestore is available
        diagnosis.tests.push({
            name: 'Firestore Availability',
            status: isFirebaseInitialized && db ? 'PASS' : 'FAIL',
            details: isFirebaseInitialized && db ? 'Firestore database reference available' : 'Firestore not available'
        });

        // Test 4: Try to connect to Firestore
        if (isFirebaseInitialized && db) {
            try {
                const testDoc = await db.collection('ai_data').doc('system_info').get();
                diagnosis.tests.push({
                    name: 'Firestore Connection',
                    status: 'PASS',
                    details: testDoc.exists ? 'Connected and document exists' : 'Connected but document missing'
                });
            } catch (error) {
                diagnosis.tests.push({
                    name: 'Firestore Connection',
                    status: 'FAIL',
                    details: `Connection error: ${error.message}`
                });

                // Add specific recommendations based on error
                if (error.code === 'permission-denied') {
                    diagnosis.recommendations.push('Update Firestore security rules to allow read/write access');
                } else if (error.code === 'unavailable') {
                    diagnosis.recommendations.push('Check internet connection and Firebase service status');
                } else {
                    diagnosis.recommendations.push(`Investigate error: ${error.code || 'unknown'}`);
                }
            }
        }

        // Test 5: Check localStorage availability
        diagnosis.tests.push({
            name: 'LocalStorage Availability',
            status: typeof Storage !== 'undefined' ? 'PASS' : 'FAIL',
            details: typeof Storage !== 'undefined' ? 'LocalStorage is available' : 'LocalStorage not supported'
        });

        // Generate recommendations
        const failedTests = diagnosis.tests.filter(test => test.status === 'FAIL');
        if (failedTests.length === 0) {
            diagnosis.recommendations.push('All systems operational! 🎉');
        } else {
            diagnosis.recommendations.push(`${failedTests.length} issue(s) detected. Check the test details above.`);
        }

        return diagnosis;
    }
}

// Make diagnosis available globally for testing
window.testFirebaseConnection = async function() {
    const db = new AIDatabase();
    const diagnosis = await db.diagnoseConnection();
    
    console.log('🔍 Firebase Connection Diagnosis:');
    console.log('=====================================');
    
    diagnosis.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${test.name}: ${test.details}`);
    });
    
    console.log('\n📋 Recommendations:');
    diagnosis.recommendations.forEach(rec => {
        console.log(`• ${rec}`);
    });
    
    console.log('=====================================');
    return diagnosis;
};
