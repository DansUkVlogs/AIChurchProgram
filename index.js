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
import { applyAutoFillLogic } from './js/autoFill.js';
import { exportToPDF, exportToJSON, importFromJSON } from './js/export.js';
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
window.exportToPDF = () => exportToPDF(programData, isThirdSunday);
window.saveAsJSON = () => exportToJSON(programData, isThirdSunday);
window.saveMissingInfo = saveMissingInfo;
window.toggleModalTile = toggleModalTile;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Show the third Sunday modal on startup
    const thirdSundayModal = new bootstrap.Modal(document.getElementById('thirdSundayModal'));
    thirdSundayModal.show();
    
    // Initialize theme
    initializeTheme();
    
    // Set up event listeners
    setupEventListeners();
    
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
function processProgram() {
    const programTextArea = document.getElementById('programText');
    if (!programTextArea) return;
    
    const text = programTextArea.value.trim();
    if (!text) {
        showAlert('Please enter or upload a program', 'warning');
        return;
    }

    // Show loading spinner
    showLoadingSpinner();

    // Parse program items
    const lines = text.split('\n').filter(line => line.trim());
    programData = [];
    missingItems = [];

    lines.forEach((line, index) => {
        const item = {
            id: index,
            programItem: line.trim(),
            camera: '',
            scene: '',
            mic: '',
            notes: ''
        };

        // Apply auto-fill logic
        applyAutoFillLogic(item, isThirdSunday);
        programData.push(item);

        // Check for missing information
        if (!item.camera || !item.scene || !item.mic) {
            missingItems.push(index);
        }
    });

    // Hide loading spinner
    hideLoadingSpinner();

    // Handle missing information
    if (missingItems.length > 0) {
        currentMissingIndex = 0;
        showMissingInfoModal();
    } else {
        displayResults();
        showAlert('Program processed successfully!', 'success');
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
            <div class="col-md-4 mb-3">
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
                <input type="hidden" id="modalCamera" value="${item.camera || ''}">
            </div>
            
            <div class="col-md-4 mb-3">
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
            
            <div class="col-md-4 mb-3">
                <label for="modalMic" class="form-label">Mic</label>
                <input type="text" class="form-control" id="modalMic" value="${item.mic}" 
                       maxlength="${CONFIG.MAX_MIC_LENGTH}" placeholder="e.g., Lectern, Amb, 2,3,4">
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
    const notes = document.getElementById('modalNotes')?.value.trim() || '';
    
    if (!camera || !scene || !mic) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    item.camera = camera;
    item.scene = scene;
    item.mic = mic;
    item.notes = notes;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('missingInfoModal'));
    if (modal) modal.hide();
    
    currentMissingIndex++;
    
    setTimeout(() => {
        showMissingInfoModal();
    }, CONFIG.MODAL_TRANSITION_DELAY);
}

// Toggle tile selection in modal
function toggleModalTile(tile, fieldType) {
    const container = tile.parentElement;
    const hiddenInput = document.getElementById(`modal${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`);
    
    if (fieldType === 'camera') {
        // Camera supports multi-select
        tile.classList.toggle('selected');
        
        const selectedTiles = container.querySelectorAll('.selection-tile.selected');
        const values = Array.from(selectedTiles).map(t => t.dataset.value);
        
        // Sort values to maintain consistent order (1,2,3,4)
        values.sort((a, b) => parseInt(a) - parseInt(b));
        
        hiddenInput.value = values.length > 1 ? values.join('/') : (values[0] || '');
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
        
        row.innerHTML = `
            <td class="fw-medium">${item.programItem}</td>
            <td>
                <span class="badge bg-primary editable-field" data-field="camera" data-index="${index}" onclick="window.editField(${index}, 'camera')">${item.camera}</span>
            </td>
            <td>
                <span class="badge bg-secondary editable-field" data-field="scene" data-index="${index}" onclick="window.editField(${index}, 'scene')">${item.scene}</span>
            </td>
            <td>
                <span class="badge bg-success editable-field" data-field="mic" data-index="${index}" onclick="window.editField(${index}, 'mic')">${item.mic}</span>
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

