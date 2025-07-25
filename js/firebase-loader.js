// Firebase Global Loader - Ensures Firebase is loaded only once
// This prevents the "Firebase is already defined" warning

let firebaseLoadPromise = null;

/**
 * Load Firebase SDK once and return a promise that resolves when it's ready
 * Subsequent calls return the same promise to prevent multiple loads
 */
export function loadFirebaseOnce() {
    // Return existing promise if already loading/loaded
    if (firebaseLoadPromise) {
        return firebaseLoadPromise;
    }
    
    // Create new loading promise
    firebaseLoadPromise = new Promise((resolve, reject) => {
        // Check if Firebase is already loaded
        if (typeof window.firebase !== 'undefined') {
            console.log('📦 Firebase already available globally');
            resolve(window.firebase);
            return;
        }
        
        // Check if Firebase scripts are already in the document
        const existingFirebaseScript = document.querySelector('script[src*="firebase-app-compat"]');
        if (existingFirebaseScript) {
            console.log('📦 Firebase scripts already present, waiting for global availability...');
            
            // Poll for Firebase to become available
            const checkFirebase = () => {
                if (typeof window.firebase !== 'undefined') {
                    console.log('📦 Firebase became available');
                    resolve(window.firebase);
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
            return;
        }
        
        console.log('📦 Loading Firebase SDK...');
        
        // Load Firebase core
        const firebaseScript = document.createElement('script');
        firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        firebaseScript.onload = () => {
            // Load Firestore
            const firestoreScript = document.createElement('script');
            firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
            firestoreScript.onload = () => {
                console.log('📦 Firebase SDK loaded successfully');
                resolve(window.firebase);
            };
            firestoreScript.onerror = () => {
                console.error('❌ Failed to load Firestore SDK');
                firebaseLoadPromise = null; // Reset so it can be retried
                reject(new Error('Failed to load Firestore SDK'));
            };
            document.head.appendChild(firestoreScript);
        };
        firebaseScript.onerror = () => {
            console.error('❌ Failed to load Firebase SDK');
            firebaseLoadPromise = null; // Reset so it can be retried
            reject(new Error('Failed to load Firebase SDK'));
        };
        document.head.appendChild(firebaseScript);
    });
    
    return firebaseLoadPromise;
}

/**
 * Reset the loader (useful for testing or error recovery)
 */
export function resetFirebaseLoader() {
    firebaseLoadPromise = null;
    console.log('🔄 Firebase loader reset');
}
