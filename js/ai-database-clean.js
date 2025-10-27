// Firebase Database Operations for AI Learning System
// This file handles all communication with Firebase to store and retrieve learning data

import { AI_CONFIG } from './ai-config.js';

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

// Initialize Firebase connection
export async function initializeDatabase() {
    try {
        // Load Firebase SDK if not already loaded
        await loadFirebaseSDK();
        
        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Get Firestore database reference
        db = firebase.firestore();
        isFirebaseInitialized = true;
        
        console.log('✅ Firebase initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.warn('AI learning will use local storage only.');
        return false;
    }
}

// Load Firebase SDK dynamically
async function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
        // Check if Firebase is already loaded
        if (typeof firebase !== 'undefined') {
            resolve();
            return;
        }
        
        // Load Firebase core
        const firebaseScript = document.createElement('script');
        firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        firebaseScript.onload = () => {
            // Load Firestore
            const firestoreScript = document.createElement('script');
            firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
            firestoreScript.onload = () => {
                console.log('📦 Firebase SDK loaded successfully');
                resolve();
            };
            firestoreScript.onerror = () => {
                console.error('❌ Failed to load Firestore SDK');
                reject(new Error('Failed to load Firestore SDK'));
            };
            document.head.appendChild(firestoreScript);
        };
        firebaseScript.onerror = () => {
            console.error('❌ Failed to load Firebase SDK');
            reject(new Error('Failed to load Firebase SDK'));
        };
        document.head.appendChild(firebaseScript);
    });
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
                await db.collection('ai_data')
                    .doc(key)
                    .set(dataWithMeta);
                console.log(`💾 Saved to Firebase: ${key}`);
            } else {
                // Fallback to localStorage
                localStorage.setItem(`ai_${key}`, JSON.stringify(dataWithMeta));
                console.log(`💾 Saved to localStorage: ${key}`);
            }

        } catch (error) {
            console.error(`❌ Error saving ${key}:`, error);
            // Always try localStorage as backup
            localStorage.setItem(`ai_${key}`, JSON.stringify(data));
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
}
