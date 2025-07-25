// Utility functions for the Church Program Smart Assistant

import { CONFIG } from './config.js';

// Alert system
export function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1055; min-width: 300px;';
    alertDiv.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after configured duration
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, CONFIG.ALERT_DURATION);
}

export function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Loading spinner
export function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'spinner-overlay';
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = `
        <div class="spinner-border spinner-border-lg text-light" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `;
    document.body.appendChild(spinner);
}

export function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Theme management
export function initializeTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    return savedTheme;
}

export function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, newTheme);
    updateThemeIcon(newTheme);
    
    return newTheme;
}

export function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// File handling utilities
export function validateFile(file, allowedTypes = CONFIG.SUPPORTED_FILE_TYPES) {
    if (!file) return { valid: false, error: 'No file selected' };
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        return { valid: false, error: 'File size too large' };
    }
    
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
        return { valid: false, error: `File type not supported. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    return { valid: true };
}

export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Data validation
export function validateProgramItem(item) {
    const errors = [];
    
    if (!item.programItem || !item.programItem.trim()) {
        errors.push('Program item is required');
    }
    
    if (!item.camera) {
        errors.push('Camera is required');
    }
    
    if (!item.scene) {
        errors.push('Scene is required');
    }
    
    if (!item.mic || !item.mic.trim()) {
        errors.push('Mic is required');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// DOM utilities
export function createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

export function addHighlightAnimation(element, type = 'success') {
    element.classList.add(`highlight-${type}`);
    setTimeout(() => element.classList.remove(`highlight-${type}`), 1000);
}

// Data export utilities
export function downloadFile(content, filename, mimeType = 'application/octet-stream') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Date utilities
export function formatDate(date = new Date()) {
    return date.toLocaleDateString();
}

export function formatDateTime(date = new Date()) {
    return date.toLocaleString();
}

// Animation utilities
export function animateElements(elements, animationClass = 'slide-in', delayMs = CONFIG.ANIMATION_DELAY) {
    elements.forEach((element, index) => {
        element.classList.add(animationClass);
        element.style.animationDelay = `${index * delayMs}ms`;
    });
}

// Keyboard utilities
export function setupKeyboardShortcuts(shortcuts) {
    document.addEventListener('keydown', function(e) {
        shortcuts.forEach(shortcut => {
            if (shortcut.condition(e)) {
                e.preventDefault();
                shortcut.action();
            }
        });
    });
}
