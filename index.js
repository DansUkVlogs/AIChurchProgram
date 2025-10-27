// Main application file for Church Program Smart Assistant
import { CONFIG, EXAMPLE_PROGRAM } from './js/config.js';
import { 
    showAlert, 
    showLoadingSpinner, 
    hideLoadingSpinner, 
    initializeTheme, 
    toggleTheme, 
    validateFile, 
    readFileAsText,
    setupKeyboardShortcuts
} from './js/utils.js';
import { 
    applyAutoFillLogic, 
    initializeAI,
    applyAutoFillWithAI,
    learnFromUserEdits,
    getAIStatus,
    getAIInsights
} from './js/autoFill.js';
import { exportToPDF, exportToJSON, importFromJSON, migrateSavedCameraInfo } from './js/export.js';
import { 
    editField, 
    saveField, 
    cancelEdit, 
    editRow, 
    saveRowEdit, 
    deleteRow, 
    addNewRow, 
    saveNewRow,
    toggleTile,
    toggleRowTile
} from './js/editing.js';

// Global variables
let isThirdSunday = false;
let programData = [];
let currentMissingIndex = -1;
let missingItems = [];

// Make functions available globally for onclick handlers
window.editField = (index, field) => editField(index, field, programData, displayResults);
window.saveField = (index, field) => saveField(index, field, programData, displayResults);
window.cancelEdit = (index, field, originalValue) => cancelEdit(index, field, originalValue, displayResults);
window.editRow = (index) => editRow(index, programData);
window.saveRowEdit = (index) => saveRowEdit(index, programData, displayResults);
window.deleteRow = (index) => deleteRow(index, programData, displayResults);
window.addNewRow = () => addNewRow(programData, displayResults);
window.saveNewRow = () => saveNewRow(programData, displayResults);
window.toggleTile = toggleTile;
window.toggleRowTile = toggleRowTile;
window.setThirdSunday = setThirdSunday;
window.toggleTheme = () => toggleTheme();
window.handleFileUpload = handleFileUpload;
window.handleJSONUpload = handleJSONUpload;
window.processProgram = processProgram;
window.loadExample = loadExample;
window.clearInput = clearInput;
window.exportToPDF = async () => await exportToPDF(programData, isThirdSunday);
window.saveAsJSON = () => exportToJSON(programData, isThirdSunday);
window.saveMissingInfo = saveMissingInfo;
window.toggleModalTile = toggleModalTile;
window.showAIInsights = function() {
    const modal = new bootstrap.Modal(document.getElementById('aiInsightsModal'));
    modal.show();
    refreshAIInsights();
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Show the third Sunday modal on startup
    const thirdSundayEl = document.getElementById('thirdSundayModal');
    // Create modal with explicit options to match markup
    const thirdSundayModal = new bootstrap.Modal(thirdSundayEl, { backdrop: 'static', keyboard: false });

    // Accessibility: ensure nothing inside the modal is focused while aria-hidden may be true during show transition.
    // Blur any currently focused element before showing the modal, then show after a very short delay so
    // Bootstrap can update aria-hidden/state before focus moves into the modal.
    try {
        const active = document.activeElement;
        if (active && typeof active.blur === 'function') active.blur();
    } catch (e) {
        console.warn('[Main] Could not blur active element before showing modal:', e);
    }

    // Small delay to avoid race between focus and aria-hidden toggling in assistive tech
    setTimeout(() => thirdSundayModal.show(), 30);
    
    // Initialize theme
    initializeTheme();
    
    // Initialize AI system (in background)
    initializeAISystem();
    
    // Set up event listeners
    setupEventListeners();

    // Global accessibility helpers for Bootstrap modals
    // Ensure no focused element remains inside an element that will be aria-hidden during modal show.
    try {
        // Before any modal is shown, blur the current active element to avoid focus being hidden
        document.addEventListener('show.bs.modal', function(evt) {
            try {
                const active = document.activeElement;
                if (active && typeof active.blur === 'function') {
                    active.blur();
                }
            } catch (e) {
                // swallow errors - accessibility best-effort
            }
        }, true);

        // After modal is fully shown, move focus into the modal for keyboard users
        document.addEventListener('shown.bs.modal', function(evt) {
            try {
                const modalEl = evt.target;
                // Find first focusable element inside modal
                const focusable = modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable && focusable.length > 0) {
                    focusable[0].focus();
                } else if (modalEl && typeof modalEl.focus === 'function') {
                    modalEl.focus();
                }
            } catch (e) {
                // ignore
            }
        }, true);
    } catch (e) {
        console.warn('[Main] Could not attach global modal accessibility handlers:', e);
    }

    // Robust cleanup: sometimes Bootstrap backdrop can remain if modals are closed rapidly or nested.
    // Ensure leftover backdrops are removed and body state restored when any modal is hidden.
    try {
        document.addEventListener('hidden.bs.modal', function(evt) {
            // Small delay to let Bootstrap finish its own cleanup
            setTimeout(() => {
                try {
                    const anyOpen = document.querySelectorAll('.modal.show').length > 0;
                    if (!anyOpen) {
                        // Remove leftover backdrop elements
                        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
                        // Ensure body classes/styles are restored
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                    }
                } catch (e) {
                    console.warn('[Main] modal cleanup failed:', e);
                }
            }, 40);
        }, true);
    } catch (e) {
        console.warn('[Main] Could not attach modal cleanup handler:', e);
    }
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts([
        {
            condition: (e) => e.ctrlKey && e.key === 'Enter',
            action: processProgram
        },
        {
            condition: (e) => e.key === 'F1',
            action: () => showAlert('Keyboard shortcuts: Ctrl+Enter to process, F1 for help', 'info')
        }
    ]);
});

// Set up event listeners
function setupEventListeners() {
    // Third Sunday toggle
    const thirdSundayToggle = document.getElementById('thirdSundayToggle');
    if (thirdSundayToggle) {
        thirdSundayToggle.addEventListener('change', function(e) {
            isThirdSunday = e.target.checked;
        });
    }
}

// Third Sunday modal functions
function setThirdSunday(value) {
    isThirdSunday = value;
    const toggle = document.getElementById('thirdSundayToggle');
    if (toggle) toggle.checked = value;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('thirdSundayModal'));
    if (modal) modal.hide();
    
    // Add fade-in animation to main content
    const container = document.querySelector('.container-fluid');
    if (container) container.classList.add('fade-in');
}

// File upload handler
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validation = validateFile(file, ['.txt']);
    if (!validation.valid) {
        showAlert(validation.error, 'warning');
        return;
    }
    
    try {
        const content = await readFileAsText(file);
        const programTextArea = document.getElementById('programText');
        if (programTextArea) {
            programTextArea.value = content;
        }
    } catch (error) {
        showAlert('Error reading file: ' + error.message, 'danger');
    }
}

// JSON file upload handler
async function handleJSONUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validation = validateFile(file, ['.json']);
    if (!validation.valid) {
        showAlert(validation.error, 'warning');
        return;
    }
    
    try {
        const content = await readFileAsText(file);
        const result = importFromJSON(content);
        
        if (result.success) {
            programData = result.data.programData;
            isThirdSunday = result.data.isThirdSunday;
            
            const toggle = document.getElementById('thirdSundayToggle');
            if (toggle) toggle.checked = isThirdSunday;
            
            displayResults();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('loadJSONModal'));
            if (modal) modal.hide();
            
            showAlert('Program loaded successfully!', 'success');
        } else {
            showAlert('Error loading JSON: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error reading JSON file: ' + error.message, 'danger');
    }
}

// Main processing function
async function processProgram() {
    const programTextArea = document.getElementById('programText');
    if (!programTextArea) return;
    
    const text = programTextArea.value.trim();
    if (!text) {
        showAlert('Please enter or upload a program', 'warning');
        return;
    }

    // Show loading spinner
    showLoadingSpinner();

    try {
        // Parse program items
        const lines = text.split('\n').filter(line => line.trim());
        programData = [];
        missingItems = [];

        // Process each line with AI-enhanced auto-fill
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const item = {
                id: index,
                programItem: line.trim(),
                camera: '',
                scene: '',
                mic: '',
                notes: '',
                stream: '' // Add stream field
            };

            // Apply AI-enhanced auto-fill logic
            const context = {
                index: index,
                totalItems: lines.length,
                itemType: '', // Could be enhanced with better parsing
                performer: ''
            };
            
            // Use AI-enhanced auto-fill if available, otherwise fall back to traditional
            const aiStatus = getAIStatus();
            if (aiStatus.isAvailable && aiStatus.isInitialized) {
                await applyAutoFillWithAI(item, isThirdSunday, context);
            } else {
                applyAutoFillLogic(item, isThirdSunday);
            }
            
            programData.push(item);

            // Check for missing information
            if (!item.camera || !item.scene || !item.mic) {
                missingItems.push(index);
            }
        }

        // Hide loading spinner
        hideLoadingSpinner();

        // Update AI status indicator after processing so any prediction errors are reflected
        try {
            updateAIStatusIndicator(getAIStatus());
        } catch (e) {
            console.warn('[Main] Could not update AI status indicator after processing:', e);
        }

        // Handle missing information
        if (missingItems.length > 0) {
            currentMissingIndex = 0;
            showMissingInfoModal();
        } else {
            displayResults();
            showAlert('Program processed successfully!', 'success');
        }
        
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error processing program:', error);
        showAlert('Error processing program: ' + error.message, 'danger');
        try { updateAIStatusIndicator(getAIStatus()); } catch (e) {}
    }
}

// Show missing information modal
function showMissingInfoModal() {
    if (currentMissingIndex >= missingItems.length) {
        displayResults();
        showAlert('All missing information completed!', 'success');
        return;
    }

    const itemIndex = missingItems[currentMissingIndex];
    const item = programData[itemIndex];
    
    const modalContent = document.getElementById('missingInfoContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = `
        <div class="mb-3">
            <h6>Program Item:</h6>
            <p class="fw-bold">${item.programItem}</p>
        </div>
        
        <div class="row">
            <div class="col-md-3 mb-3">
                <label class="form-label">Camera</label>
                <div class="tile-container" id="modalCameraTiles">
                    <div class="selection-tile ${item.camera === '1' || (item.camera && item.camera.includes('1')) ? 'selected' : ''}" 
                         data-value="1" onclick="toggleModalTile(this, 'camera')">1</div>
                    <div class="selection-tile ${item.camera === '2' || (item.camera && item.camera.includes('2')) ? 'selected' : ''}" 
                         data-value="2" onclick="toggleModalTile(this, 'camera')">2</div>
                    <div class="selection-tile ${item.camera === '3' || (item.camera && item.camera.includes('3')) ? 'selected' : ''}" 
                         data-value="3" onclick="toggleModalTile(this, 'camera')">3</div>
                    <div class="selection-tile ${item.camera === '4' || (item.camera && item.camera.includes('4')) ? 'selected' : ''}" 
                         data-value="4" onclick="toggleModalTile(this, 'camera')">4</div>
                </div>
                <!-- Camera 2 sub-options (1-9 and 0) -->
                <div class="mt-2" id="modalCameraSubsContainer" style="display: none;">
                    <small class="text-muted">Camera 2 presets (select one or more)</small>
                    <div class="tile-container mt-1" id="modalCameraSubs">
                        ${[1,2,3,4,5,6,7,8,9,'0'].map(n => `
                            <div class="selection-tile" data-value="${n}" onclick="toggleModalSubTile(this)">${n}</div>
                        `).join('')}
                    </div>
                </div>
                <input type="hidden" id="modalCamera" value="${item.camera || ''}">
                <input type="hidden" id="modalCameraSubsValue" value="">
            </div>
            
            <div class="col-md-3 mb-3">
                <label class="form-label">Scene</label>
                <div class="tile-container" id="modalSceneTiles">
                    <div class="selection-tile ${item.scene === '1' || (item.scene && item.scene.includes('1')) ? 'selected' : ''}" 
                         data-value="1" onclick="toggleModalTile(this, 'scene')">1</div>
                    <div class="selection-tile ${item.scene === '2' || (item.scene && item.scene.includes('2')) ? 'selected' : ''}" 
                         data-value="2" onclick="toggleModalTile(this, 'scene')">2</div>
                    <div class="selection-tile ${item.scene === '3' || (item.scene && item.scene.includes('3')) ? 'selected' : ''}" 
                         data-value="3" onclick="toggleModalTile(this, 'scene')">3</div>
                </div>
                <input type="hidden" id="modalScene" value="${item.scene || ''}">
            </div>
            
            <div class="col-md-3 mb-3">
                <label for="modalMic" class="form-label">Mic</label>
                <input type="text" class="form-control" id="modalMic" value="${item.mic}" 
                       maxlength="${CONFIG.MAX_MIC_LENGTH}" placeholder="e.g., Lectern, Amb, 2,3,4">
            </div>

            <div class="col-md-3 mb-3">
                <label for="modalStream" class="form-label">Stream</label>
                <select class="form-select" id="modalStream">
                    <option value="">None</option>
                    <option value="1" ${item.stream === '1' ? 'selected' : ''}>1 (Go Live + YouTube)</option>
                    <option value="2" ${item.stream === '2' ? 'selected' : ''}>2 (Go Live)</option>
                </select>
            </div>
        </div>
        
        <div class="mb-3">
            <label for="modalNotes" class="form-label">Notes (Optional)</label>
            <input type="text" class="form-control" id="modalNotes" value="${item.notes || ''}" 
                   maxlength="${CONFIG.MAX_NOTES_LENGTH}" placeholder="Optional notes">
        </div>
        
        <div class="mb-3">
            <small class="text-muted">
                Progress: ${currentMissingIndex + 1} of ${missingItems.length} items
            </small>
        </div>
    `;

    // After inserting modal HTML, initialize Camera 2 sub-selection if present in existing value
    try {
        const camStr = (item.camera || '').trim();
        const mainInput = document.getElementById('modalCamera');
        const subsInput = document.getElementById('modalCameraSubsValue');
        const subsContainer = document.getElementById('modalCameraSubsContainer');

        if (camStr) {
            // Parse camera parts like "2 (6/7) / 4" or "2(6/7)/4"
            const parts = camStr.split('/').map(p => p.trim());
            const primaries = [];
            let subsVal = '';
            parts.forEach(p => {
                const m = p.match(/^(\d+)\s*(?:\(([^)]+)\))?$/);
                if (m) {
                    primaries.push(m[1]);
                    if (m[1] === '2' && m[2]) subsVal = m[2].trim();
                }
            });

            if (primaries.length > 0) {
                // Compose normalized main value
                const composed = primaries.map(v => (v === '2' && subsVal) ? `2 (${subsVal})` : v).join(' / ');
                if (mainInput) mainInput.value = composed;
            }

            // If there are subs for camera 2, show the subs container and select tiles
            if (subsVal && subsContainer) {
                subsContainer.style.display = 'block';
                if (subsInput) subsInput.value = subsVal;
                const subsArr = subsVal.split('/').map(s => s.trim());
                const subsTiles = document.querySelectorAll('#modalCameraSubs .selection-tile');
                subsTiles.forEach(t => {
                    if (subsArr.includes(String(t.dataset.value))) t.classList.add('selected');
                    else t.classList.remove('selected');
                });
            }
        }
    } catch (e) {
        console.warn('[Modal Init] Could not initialize camera subs:', e);
    }

    const modal = new bootstrap.Modal(document.getElementById('missingInfoModal'));
    modal.show();
}

// Save missing information
function saveMissingInfo() {
    const itemIndex = missingItems[currentMissingIndex];
    const item = programData[itemIndex];
    
    const camera = document.getElementById('modalCamera')?.value;
    const scene = document.getElementById('modalScene')?.value;
    const mic = document.getElementById('modalMic')?.value;
    const stream = document.getElementById('modalStream')?.value;
    const notes = document.getElementById('modalNotes')?.value.trim() || '';
    
    if (!camera || !scene || !mic) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    item.camera = camera;
    item.scene = scene;
    item.mic = mic;
    item.stream = stream || '';
    item.notes = notes;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('missingInfoModal'));
    if (modal) modal.hide();
    
    // Update AI status in case any changes triggered AI learning/errors
    try { updateAIStatusIndicator(getAIStatus()); } catch (e) {}

    currentMissingIndex++;
    
    setTimeout(() => {
        showMissingInfoModal();
    }, CONFIG.MODAL_TRANSITION_DELAY);
}

// Toggle tile selection in modal
function toggleModalTile(tile, fieldType) {
    console.log('[Modal] toggleModalTile', fieldType, tile && tile.dataset && tile.dataset.value);
    const container = tile.parentElement;
    const hiddenInput = document.getElementById(`modal${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`);
    
    if (fieldType === 'camera') {
        // Camera supports multi-select
        tile.classList.toggle('selected');
        
        const selectedTiles = container.querySelectorAll('.selection-tile.selected');
        const values = Array.from(selectedTiles).map(t => t.dataset.value);
        
        // Sort values to maintain consistent order (1,2,3,4)
        values.sort((a, b) => parseInt(a) - parseInt(b));
        
        // If there are camera 2 sub-options selected, include them in parentheses
        const subsInput = document.getElementById('modalCameraSubsValue');
        const subs = subsInput ? (subsInput.value || '') : '';

        // Compose camera value preserving order and adding subs for camera '2'
        const composed = values.map(v => {
            if (v === '2' && subs) return `2 (${subs.replace(/\//g, '/').replace(/\s+/g,'')})`;
            return v;
        }).join(' / ');

    hiddenInput.value = composed;
    console.log('[Modal] camera composed value:', composed, 'subs:', subs);

        // Show or hide the subs container depending on whether camera '2' is selected
        const subsContainer = document.getElementById('modalCameraSubsContainer');
        if (values.includes('2')) {
            if (subsContainer) subsContainer.style.display = 'block';
            // Pre-select any subs that are already present in the hidden subs input
            if (subs) {
                const subsTiles = document.querySelectorAll('#modalCameraSubs .selection-tile');
                const subsArr = subs.split('/').map(s => s.trim());
                subsTiles.forEach(t => {
                    if (subsArr.includes(String(t.dataset.value))) t.classList.add('selected');
                    else t.classList.remove('selected');
                });
            }
        } else {
            if (subsContainer) subsContainer.style.display = 'none';
            // Clear subs when camera 2 is no longer selected
            if (subsInput) subsInput.value = '';
            const subsTiles = document.querySelectorAll('#modalCameraSubs .selection-tile');
            subsTiles.forEach(t => t.classList.remove('selected'));
            console.log('[Modal] camera 2 not selected - cleared subs');
        }
    } else if (fieldType === 'scene') {
        // Scene supports multi-select
        tile.classList.toggle('selected');
        
        const selectedTiles = container.querySelectorAll('.selection-tile.selected');
        const values = Array.from(selectedTiles).map(t => t.dataset.value);
        
        // Sort values to maintain consistent order (1,2,3)
        values.sort((a, b) => parseInt(a) - parseInt(b));
        
        hiddenInput.value = values.length > 1 ? values.join('/') : (values[0] || '');
    }
}

// Toggle a Camera 2 sub-option tile (1-9,0)
function toggleModalSubTile(tile) {
    tile.classList.toggle('selected');
    console.log('[Modal] toggleModalSubTile clicked', tile.dataset && tile.dataset.value);

    const subsTiles = document.querySelectorAll('#modalCameraSubs .selection-tile.selected');
    const values = Array.from(subsTiles).map(t => String(t.dataset.value));
    // Sort numerically with '0' as 0 at end? We'll sort with numeric parse where '0' becomes 0
    values.sort((a,b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        return na - nb;
    });

    const subsInput = document.getElementById('modalCameraSubsValue');
    if (subsInput) subsInput.value = values.join('/');
    console.log('[Modal] subs selected now:', subsInput ? subsInput.value : values.join('/'));

    // Update the main camera hidden value to reflect subs
    const hiddenInput = document.getElementById('modalCamera');
    const container = document.getElementById('modalCameraTiles');
    const selectedTiles = container.querySelectorAll('.selection-tile.selected');
    const primaries = Array.from(selectedTiles).map(t => t.dataset.value);
    primaries.sort((a,b) => parseInt(a)-parseInt(b));

    const composed = primaries.map(v => v === '2' && subsInput && subsInput.value ? `2 (${subsInput.value})` : v).join(' / ');
    if (hiddenInput) hiddenInput.value = composed;
    console.log('[Modal] updated main camera hidden value to:', composed);
}

// Expose sub-tile toggle to global scope for inline onclick handlers
try { window.toggleModalSubTile = toggleModalSubTile; } catch (e) {}
try { window.toggleModalTile = toggleModalTile; } catch (e) {}

// Display results table
function displayResults() {
    const tableBody = document.getElementById('programTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    programData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'slide-in';
        row.style.animationDelay = `${index * CONFIG.ANIMATION_DELAY}ms`;
        row.id = `row-${index}`;
        
        // Helper function to display stream value
        const getStreamDisplay = (stream) => {
            if (stream === '1') return '1 (Go Live + YouTube)';
            if (stream === '2') return '2 (Go Live)';
            return stream || 'Add stream...';
        };
        
        row.innerHTML = `
            <td class="fw-medium">${item.programItem}</td>
            <td>
                <span class="badge bg-primary editable-field" data-field="camera" data-index="${index}" onclick="window.editField(${index}, 'camera')">${item.camera}</span>
            </td>
            <td>
                <span class="badge badge-scene editable-field" data-field="scene" data-index="${index}" onclick="window.editField(${index}, 'scene')">${item.scene}</span>
            </td>
            <td>
                <span class="badge bg-success editable-field" data-field="mic" data-index="${index}" onclick="window.editField(${index}, 'mic')">${item.mic}</span>
            </td>
            <td>
                <span class="badge bg-info editable-field ${item.stream ? '' : 'text-muted'}" data-field="stream" data-index="${index}" onclick="window.editField(${index}, 'stream')">${getStreamDisplay(item.stream)}</span>
            </td>
            <td>
                <span class="badge bg-warning editable-field ${item.notes ? '' : 'text-muted'}" data-field="notes" data-index="${index}" onclick="window.editField(${index}, 'notes')">${item.notes || 'Add notes...'}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editRow(${index})" title="Edit Row">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteRow(${index})" title="Delete Row">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Clear input
function clearInput() {
    const programText = document.getElementById('programText');
    const fileInput = document.getElementById('fileInput');
    const resultsSection = document.getElementById('resultsSection');
    
    if (programText) programText.value = '';
    if (fileInput) fileInput.value = '';
    if (resultsSection) resultsSection.style.display = 'none';
    
    programData = [];
    missingItems = [];
    currentMissingIndex = -1;
}

// Load example program
function loadExample() {
    const programText = document.getElementById('programText');
    if (programText) {
        programText.value = EXAMPLE_PROGRAM;
        showAlert('Example program loaded!', 'info');
    }
}

// Initialize AI system in background
async function initializeAISystem() {
    try {
        console.log('[Main] Initializing AI system...');
        await initializeAI();
        
        // Show AI status if available
        const aiStatus = getAIStatus();
        if (aiStatus.isAvailable) {
            console.log(`[Main] AI system ready - Phase: ${aiStatus.currentPhase}`);
            
            // Could add a small indicator in the UI showing AI is active
            updateAIStatusIndicator(aiStatus);
        }
    } catch (error) {
        console.warn('[Main] AI system initialization failed:', error);
        // App continues to work without AI
    }
}

// Update AI status indicator in UI
function updateAIStatusIndicator(aiStatus) {
    const statusElement = document.getElementById('aiStatus');
    if (statusElement) {
        statusElement.style.display = 'inline';
        
        if (aiStatus.isInitialized) {
            const phaseNames = {
                'rule-based': 'Learning',
                'pattern-learning': 'Patterns',
                'hybrid': 'Hybrid AI',
                'neural-primary': 'Smart AI'
            };
            
            const phaseName = phaseNames[aiStatus.currentPhase] || 'Active';
            // If AI has recent prediction errors, show warning badge instead
            if (aiStatus.hasError) {
                statusElement.innerHTML = `<i class="fas fa-robot me-1"></i>AI: ${phaseName} (errors)`;
                statusElement.className = 'badge bg-danger me-2';
                statusElement.title = `AI System Active (errors detected) - Phase: ${aiStatus.currentPhase}\nLast error: ${aiStatus.lastErrorMessage || 'unknown'}`;
            } else {
                statusElement.innerHTML = `<i class="fas fa-robot me-1"></i>AI: ${phaseName}`;
                statusElement.className = 'badge bg-success me-2';
                // Add tooltip with more details
                statusElement.title = `AI System Active - Phase: ${aiStatus.currentPhase}\nTotal Predictions: ${aiStatus.performance?.totalPredictions || 0}\nAccuracy: ${((aiStatus.performance?.overallAccuracy || 0) * 100).toFixed(1)}%`;
            }
        } else {
            statusElement.innerHTML = '<i class="fas fa-robot me-1"></i>AI: Starting';
            statusElement.className = 'badge bg-warning me-2';
            statusElement.title = 'AI system is starting up...';
        }
    }
}

// Expose helper to window so you can refresh the AI status badge from the console
try { window.updateAIStatusIndicator = updateAIStatusIndicator; } catch (e) { /* ignore */ }

// Expose migration helper so user can migrate loaded program data in-memory
try {
    window.migrateSavedCameraInfo = function() {
        try {
            migrateSavedCameraInfo(programData);
            displayResults();
            showAlert('Migrated camera info for current program data', 'success');
        } catch (e) {
            console.error('Migration failed:', e);
            showAlert('Migration failed: ' + e.message, 'danger');
        }
    };
} catch (e) {}

// Refresh AI insights
window.refreshAIInsights = function() {
    const content = document.getElementById('aiInsightsContent');
    if (!content) return;
    
    try {
        const aiStatus = getAIStatus();
        const aiInsights = getAIInsights();
        
        if (!aiStatus.isAvailable) {
            content.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    AI system is not yet available. The system will start learning after processing a few programs.
                </div>
            `;
            return;
        }
        
        content.innerHTML = generateAIInsightsHTML(aiStatus, aiInsights);
        
    } catch (error) {
        console.error('Error refreshing AI insights:', error);
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading AI insights: ${error.message}
            </div>
        `;
    }
};

// Wire up AI Saving toggle in the AI Insights modal
document.addEventListener('DOMContentLoaded', function() {
    try {
        const aiToggle = document.getElementById('aiSavingToggle');
        const applyBtn = document.getElementById('applyAISavingBtn');

        const current = localStorage.getItem('ai_saving_enabled');
        if (aiToggle) aiToggle.checked = (current === null ? true : current === 'true');

        if (applyBtn) {
            applyBtn.addEventListener('click', function() {
                const enabled = aiToggle ? aiToggle.checked : true;
                localStorage.setItem('ai_saving_enabled', String(enabled));
                showAlert('AI saving ' + (enabled ? 'enabled' : 'disabled'), 'info');
            });
        }
    } catch (e) {
        console.warn('[Main] Could not initialize AI saving toggle:', e);
    }

    // Wire up clear training confirm button
    try {
        const confirmBtn = document.getElementById('confirmClearTrainingBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
                const pwdInput = document.getElementById('clearTrainingPassword');
                const status = document.getElementById('clearTrainingStatus');
                if (!pwdInput) return;
                // Trim whitespace to avoid accidental mismatches
                const pwd = (pwdInput.value || '').toString().trim();

                if (!pwd) {
                    if (status) status.innerText = 'Please enter the admin password';
                    showAlert('Please enter the admin password to confirm', 'warning');
                    return;
                }

                // Pre-check password against the expected value (default or stored override) to provide clearer UX
                let expected = 'admin123';
                try {
                    const stored = localStorage.getItem('admin_password');
                    if (stored && stored.toString().trim()) expected = stored.toString().trim();
                } catch (e) {
                    // ignore
                }

                if (pwd !== expected) {
                    // If mismatch, provide a clearer hint and do not call the destructive API
                    if (status) status.innerText = 'Invalid admin password (does not match stored password)';
                    showAlert('Invalid admin password. If you previously set a custom admin password, remove it or use that password.', 'danger');
                    return;
                }

                status.innerText = 'Clearing...';
                confirmBtn.disabled = true;
                try {
                    const module = await import('./js/ai-database.js');
                    await module.clearAllTrainingData(pwd);
                    status.innerText = 'Training data cleared successfully.';
                    showAlert('Training data cleared successfully', 'success');
                    // clear password field for security
                    try { pwdInput.value = ''; } catch (e) {}

                    // close both modals after short delay
                    setTimeout(() => {
                        const clearModal = bootstrap.Modal.getInstance(document.getElementById('clearTrainingModal'));
                        if (clearModal) clearModal.hide();
                        const helpModal = bootstrap.Modal.getInstance(document.getElementById('helpModal'));
                        if (helpModal) helpModal.hide();
                    }, 800);
                } catch (err) {
                    console.error('Clear training failed:', err);
                    const msg = (err && err.message) ? err.message : 'Failed to clear training data';
                    // Provide clearer messaging for invalid password
                    if (msg === 'Invalid password') {
                        status.innerText = 'Invalid admin password';
                        showAlert('Invalid admin password', 'danger');
                    } else {
                        status.innerText = 'Error: ' + msg;
                        showAlert('Clear failed: ' + msg, 'danger');
                    }
                } finally {
                    confirmBtn.disabled = false;
                }
            });
        }
    } catch (e) {
        console.warn('[Main] Could not wire clear training button:', e);
    }

    // Show a helpful hint when the Clear Training modal is shown (default dev password or stored override)
    try {
        const clearModalEl = document.getElementById('clearTrainingModal');
        if (clearModalEl) {
            clearModalEl.addEventListener('show.bs.modal', function() {
                const hintEl = document.getElementById('clearTrainingHint');
                try {
                    const stored = localStorage.getItem('admin_password');
                    if (stored && stored.toString().trim()) {
                        if (hintEl) hintEl.innerHTML = '<small class="text-muted">A custom admin password is stored locally. Use that password to confirm.</small>';
                    } else {
                        if (hintEl) hintEl.innerHTML = '<small class="text-muted">Enter admin password to confirm</small>';
                    }
                } catch (err) {
                    if (hintEl) hintEl.innerHTML = '<small class="text-muted">Enter admin password to confirm</small>';
                }
            });
        }
    } catch (e) {
        console.warn('[Main] Could not attach clear modal hint handler:', e);
    }
});

// Generate HTML for AI insights
function generateAIInsightsHTML(aiStatus, aiInsights) {
    const perf = aiStatus.performance || {};
    const progress = aiStatus.phaseProgress || {};
    const requirements = aiStatus.nextPhaseRequirements || {};
    
    return `
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-chart-line me-2"></i>System Status
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Current Phase</small>
                                <div class="fw-bold">${aiStatus.currentPhase || 'Unknown'}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Total Predictions</small>
                                <div class="fw-bold">${perf.totalPredictions || 0}</div>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <small class="text-muted">Overall Accuracy</small>
                                <div class="fw-bold text-${(perf.overallAccuracy || 0) > 0.7 ? 'success' : 'warning'}">
                                    ${((perf.overallAccuracy || 0) * 100).toFixed(1)}%
                                </div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Trend</small>
                                <div class="fw-bold text-${perf.trend === 'improving' ? 'success' : perf.trend === 'declining' ? 'danger' : 'info'}">
                                    ${perf.trend || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-arrow-up me-2"></i>Progress to Next Phase
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <small class="text-muted">Next: ${requirements.nextPhase || 'Complete'}</small>
                        </div>
                        ${ (typeof progress.percentage === 'number' && isFinite(progress.percentage)) ? `
                            <div class="progress mb-2">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${Math.max(0, Math.min(100, progress.percentage))}%" 
                                     aria-valuenow="${Math.max(0, Math.min(100, progress.percentage))}" 
                                     aria-valuemin="0" aria-valuemax="100">
                                    ${Number.isFinite(progress.percentage) ? progress.percentage.toFixed(0) : '0'}%
                                </div>
                            </div>
                            <small class="text-muted">
                                ${progress.current || 0} / ${progress.required || 0} predictions
                                ${progress.accuracyRequired ? ` | ${progress.accuracyRequired}% accuracy needed` : ''}
                            </small>
                        ` : '<small class="text-muted">System complete</small>'}
                    </div>
                </div>
            </div>
        </div>
        
        ${aiInsights && aiInsights.fieldBreakdown ? `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-cogs me-2"></i>Field Performance
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        ${aiInsights.fieldBreakdown.map(field => `
                            <div class="col-md-3 mb-3">
                                <div class="text-center">
                                    <div class="text-muted small">${field.field.toUpperCase()}</div>
                                    <div class="fw-bold">${field.accuracy}</div>
                                    <div class="small text-muted">${field.totalPredictions} predictions</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-lightbulb me-2"></i>
            <strong>How it works:</strong> The AI system learns from your corrections and gradually improves its predictions. 
            It starts with simple rules, then learns patterns, and eventually uses advanced neural networks for the most accurate predictions.
        </div>
    `;
}

// Enhanced field saving that learns from user edits
window.saveFieldWithLearning = async function(index, field) {
    // Get the current values before saving
    const item = programData[index];
    const originalValues = {
        camera: item.camera,
        scene: item.scene,
        mic: item.mic,
        notes: item.notes,
        stream: item.stream
    };
    
    // Call the original save function
    const result = saveField(index, field, programData, displayResults);
    
    // Learn from user edits if AI is available
    if (item._aiPredictions && getAIStatus().isAvailable) {
        const finalValues = {
            camera: item.camera,
            scene: item.scene,
            mic: item.mic,
            notes: item.notes,
            stream: item.stream
        };
        
        await learnFromUserEdits(item, finalValues, {
            field: field,
            editType: 'single-field'
        });
    }
    
    return result;
};

// Enhanced row saving that learns from user edits
window.saveRowEditWithLearning = async function(index) {
    // Get the current values before saving
    const item = programData[index];
    const originalValues = {
        camera: item.camera,
        scene: item.scene,
        mic: item.mic,
        notes: item.notes,
        stream: item.stream
    };
    
    // Call the original save function
    const result = saveRowEdit(index, programData, displayResults);
    
    // Learn from user edits if AI is available
    if (item._aiPredictions && getAIStatus().isAvailable) {
        const finalValues = {
            camera: item.camera,
            scene: item.scene,
            mic: item.mic,
            notes: item.notes,
            stream: item.stream
        };
        
        await learnFromUserEdits(item, finalValues, {
            editType: 'full-row'
        });
    }
    
    return result;
};

