// Editing functionality for the Church Program Smart Assistant

import { CONFIG, FORM_OPTIONS } from './config.js';
import { showAlert, addHighlightAnimation, validateProgramItem } from './utils.js';
import { getAILearning } from './autoFill.js';

let currentEditIndex = -1;

// Helper: parse a composed camera string like "2 (3/4) / 1" into primaries array and subs for 2
function parseComposedCamera(value) {
    const result = { primaries: [], subsFor2: '' };
    if (!value || !value.toString) return result;
    const parts = value.toString().split('/').map(p => p.trim()).filter(Boolean);
    parts.forEach(p => {
        const m = p.match(/^(\d+)\s*(?:\(([^)]+)\))?$/);
        if (m) {
            result.primaries.push(m[1]);
            if (m[1] === '2' && m[2]) result.subsFor2 = m[2].trim();
        }
    });
    return result;
}

function composeCameraFromPrimaries(primaries, subsFor2) {
    // primaries: array of primary strings in desired order e.g. ['2','1']
    return primaries.map(p => (p === '2' && subsFor2) ? `2 (${subsFor2})` : p).join(' / ');
}

// Quick field editing
export function editField(index, field, programData, displayCallback) {
    const item = programData[index];
    const currentValue = item[field];
    
    let inputHtml = '';
    if (field === 'camera') {
        inputHtml = createSelectInput(field, index, currentValue, FORM_OPTIONS.camera);
    } else if (field === 'scene') {
        inputHtml = createSelectInput(field, index, currentValue, FORM_OPTIONS.scene);
    } else if (field === 'stream') {
        inputHtml = `
            <select class="form-select form-select-sm" id="edit-${field}-${index}" style="min-width: 150px;">
                <option value="">None</option>
                <option value="1" ${currentValue === '1' ? 'selected' : ''}>1 (Go Live + YouTube)</option>
                <option value="2" ${currentValue === '2' ? 'selected' : ''}>2 (Go Live)</option>
            </select>
        `;
    } else if (field === 'mic') {
        inputHtml = `
            <input type="text" class="form-control form-control-sm" id="edit-${field}-${index}" 
                   value="${currentValue}" maxlength="${CONFIG.MAX_MIC_LENGTH}" style="min-width: 120px;">
        `;
    } else if (field === 'notes') {
        inputHtml = `
            <input type="text" class="form-control form-control-sm" id="edit-${field}-${index}" 
                   value="${currentValue}" maxlength="${CONFIG.MAX_NOTES_LENGTH}" style="min-width: 120px;" placeholder="Optional notes">
        `;
    }
    
    const fieldElement = document.querySelector(`[data-field="${field}"][data-index="${index}"]`);
    if (!fieldElement) return;
    
    const cell = fieldElement.parentElement;
    
    cell.innerHTML = `
        <div class="d-flex align-items-center gap-1">
            ${inputHtml}
            <button class="btn btn-sm btn-success" onclick="window.saveField(${index}, '${field}')">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn btn-sm btn-secondary" onclick="window.cancelEdit(${index}, '${field}', '${currentValue}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Focus on the input
    const input = document.getElementById(`edit-${field}-${index}`);
    if (input) {
        input.focus();
        if (input.select) input.select();
        // If this is the inline camera editor, initialize Camera 2 subs visibility/selection
        try {
            if (field === 'camera') {
                const camStr = (currentValue || '').trim();
                const inlineSubsContainer = document.getElementById(`inlineCameraSubs-${index}`);
                const inlineSubsInput = document.getElementById(`edit-camera-${index}-subs`);
                if (camStr) {
                    const parsed = parseComposedCamera(camStr);
                    const subsVal = parsed.subsFor2;

                    if (subsVal && inlineSubsContainer) {
                        inlineSubsContainer.style.display = 'block';
                        if (inlineSubsInput) inlineSubsInput.value = subsVal;
                        const subsArr = subsVal.split('/').map(s => s.trim());
                        const subsTiles = document.querySelectorAll(`#inlineCameraSubsTiles-${index} .selection-tile`);
                        subsTiles.forEach(t => {
                            if (subsArr.includes(String(t.dataset.value))) t.classList.add('selected');
                            else t.classList.remove('selected');
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('[editField] inline subs init failed', e);
        }
    }
}

// Create select input HTML
function createSelectInput(field, index, currentValue, options) {
    if (field === 'camera' || field === 'scene') {
        // Create tile-based selection for camera and scene
        const parsed = parseComposedCamera(currentValue);
        const tilesHtml = options.map(option => {
            // Only mark selected when the primary matches exactly (avoid substring matches from subs)
            const isSelected = parsed.primaries.includes(option.value);
            return `
                <div class="selection-tile ${isSelected ? 'selected' : ''}" 
                     data-value="${option.value}" 
                     onclick="toggleTile(this, '${field}', ${index})">
                    ${option.label}
                </div>
            `;
        }).join('');
        
        return `
            <div class="tile-container" id="tiles-${field}-${index}">
                ${tilesHtml}
            </div>
            <input type="hidden" id="edit-${field}-${index}" value="${currentValue}">
            <!-- Inline Camera 2 sub-options -->
            ${field === 'camera' ? `
                <div class="mt-2" id="inlineCameraSubs-${index}" style="display: none;">
                    <small class="text-muted">Camera 2 presets (select one or more)</small>
                    <div class="tile-container mt-1" id="inlineCameraSubsTiles-${index}">
                        ${[1,2,3,4,5,6,7,8,9,'0'].map(n => `
                            <div class="selection-tile" data-value="${n}" onclick="toggleInlineSubTile(this, ${index})">${n}</div>
                        `).join('')}
                    </div>
                </div>
                <input type="hidden" id="edit-${field}-${index}-subs" value="">
            ` : ''}
        `;
    } else {
        // Keep dropdown for other fields (if any)
        const optionsHtml = options.map(option => 
            `<option value="${option.value}" ${currentValue === option.value ? 'selected' : ''}>${option.label}</option>`
        ).join('');
        
        return `
            <select class="form-select form-select-sm" id="edit-${field}-${index}">
                ${optionsHtml}
            </select>
        `;
    }
}

// Save field edit
export function saveField(index, field, programData, displayCallback) {
    const input = document.getElementById(`edit-${field}-${index}`);
    if (!input) return;
    
    const newValue = input.value.trim();
    const oldValue = programData[index][field];
    
    // Notes and stream fields can be empty, but other fields cannot
    if (!newValue && field !== 'notes' && field !== 'stream') {
        showAlert('Field cannot be empty', 'warning');
        return;
    }
    
    // Update the data
    programData[index][field] = newValue;
    
    // Update the display
    const cell = input.closest('td');
    const badgeClass = getBadgeClass(field);
    
    cell.innerHTML = `
        <span class="badge ${badgeClass} editable-field" data-field="${field}" data-index="${index}" onclick="window.editField(${index}, '${field}')">${newValue}</span>
    `;
    
    // Add highlight animation
    addHighlightAnimation(cell);
    
    showAlert(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`, 'success');
}

// Cancel field edit
export function cancelEdit(index, field, originalValue, displayCallback) {
    const fieldSelector = `[data-field="${field}"][data-index="${index}"]`;
    const existingField = document.querySelector(fieldSelector);
    
    if (existingField && existingField.parentElement) {
        const cell = existingField.parentElement;
        const badgeClass = getBadgeClass(field);
        
        cell.innerHTML = `
            <span class="badge ${badgeClass} editable-field" data-field="${field}" data-index="${index}" onclick="window.editField(${index}, '${field}')">${originalValue}</span>
        `;
    }
}

// Get badge class for field type
function getBadgeClass(field) {
    const classes = {
        camera: 'bg-primary',
        scene: 'bg-secondary',
        mic: 'bg-success',
        stream: 'bg-info',
        notes: 'bg-warning'
    };
    return classes[field] || 'bg-secondary';
}

// Full row editing
export function editRow(index, programData) {
    const item = programData[index];
    currentEditIndex = index;
    
    const modalContent = document.getElementById('missingInfoContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = createRowEditForm(item);

    // Initialize Camera 2 subs if present in item.camera
    try {
        const camStr = (item.camera || '').trim();
        const mainInput = document.getElementById('editRowCamera');
        const subsInput = document.getElementById('editRowCameraSubsValue');
        const subsContainer = document.getElementById('editRowCameraSubsContainer');

        if (camStr) {
            const parts = camStr.split('/').map(p => p.trim());
                const parsed = parseComposedCamera(camStr);
                const primaries = parsed.primaries;
                const subsVal = parsed.subsFor2;

            if (primaries.length > 0) {
                    const composed = composeCameraFromPrimaries(primaries, subsVal);
                    if (mainInput) mainInput.value = composed;
            }

            if (subsVal && subsContainer) {
                subsContainer.style.display = 'block';
                if (subsInput) subsInput.value = subsVal;
                const subsArr = subsVal.split('/').map(s => s.trim());
                const subsTiles = document.querySelectorAll('#editRowCameraSubs .selection-tile');
                subsTiles.forEach(t => {
                    if (subsArr.includes(String(t.dataset.value))) t.classList.add('selected');
                    else t.classList.remove('selected');
                });
            }
        }
    } catch (e) {
        console.warn('[editRow] Could not initialize camera subs:', e);
    }

    // Update modal title and button
    const modalTitle = document.querySelector('#missingInfoModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fas fa-edit me-2"></i>Edit Row
        `;
    }
    
    // Change the save button to update the row
    const saveButton = document.querySelector('#missingInfoModal .btn-primary');
    if (saveButton) {
        saveButton.onclick = () => window.saveRowEdit(index);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('missingInfoModal'));
    modal.show();
}

// Create row edit form HTML
function createRowEditForm(item) {
    const parsed = parseComposedCamera(item.camera);
    const cameraTiles = FORM_OPTIONS.camera.map(option => {
        const isSelected = parsed.primaries.includes(option.value);
        return `
            <div class="selection-tile ${isSelected ? 'selected' : ''}" 
                 data-value="${option.value}" 
                 onclick="toggleRowTile(this, 'camera')">
                ${option.label}
            </div>
        `;
    }).join('');
    
    const parsedScene = parseComposedCamera(item.scene);
    const sceneTiles = FORM_OPTIONS.scene.map(option => {
        const isSelected = parsedScene.primaries.includes(option.value);
        return `
            <div class="selection-tile ${isSelected ? 'selected' : ''}" 
                 data-value="${option.value}" 
                 onclick="toggleRowTile(this, 'scene')">
                ${option.label}
            </div>
        `;
    }).join('');
    
    return `
        <div class="mb-3">
            <h6>Edit Program Item:</h6>
            <p class="fw-bold">${item.programItem}</p>
        </div>
        
        <div class="row">
            <div class="col-md-3 mb-3">
                <label class="form-label">Camera</label>
                <div class="tile-container" id="editRowCameraTiles">
                    ${cameraTiles}
                </div>
                <input type="hidden" id="editRowCamera" value="${item.camera}">
                <!-- Camera 2 sub-options -->
                <div class="mt-2" id="editRowCameraSubsContainer" style="display:none;">
                    <small class="text-muted">Camera 2 presets (select one or more)</small>
                    <div class="tile-container mt-1" id="editRowCameraSubs">
                        ${[1,2,3,4,5,6,7,8,9,'0'].map(n => `
                            <div class="selection-tile" data-value="${n}" onclick="window.toggleRowSubTile(this)">${n}</div>
                        `).join('')}
                    </div>
                </div>
                <input type="hidden" id="editRowCameraSubsValue" value="">
            </div>
            
            <div class="col-md-3 mb-3">
                <label class="form-label">Scene</label>
                <div class="tile-container" id="editRowSceneTiles">
                    ${sceneTiles}
                </div>
                <input type="hidden" id="editRowScene" value="${item.scene}">
            </div>
            
            <div class="col-md-3 mb-3">
                <label for="editRowMic" class="form-label">Mic</label>
                <input type="text" class="form-control" id="editRowMic" value="${item.mic}" 
                       maxlength="${CONFIG.MAX_MIC_LENGTH}" placeholder="e.g., Lectern, Amb, 2,3,4">
            </div>

            <div class="col-md-3 mb-3">
                <label for="editRowStream" class="form-label">Stream</label>
                <select class="form-select" id="editRowStream">
                    <option value="">None</option>
                    <option value="1" ${item.stream === '1' ? 'selected' : ''}>1 (Go Live + YouTube)</option>
                    <option value="2" ${item.stream === '2' ? 'selected' : ''}>2 (Go Live)</option>
                </select>
            </div>
        </div>
        
        <div class="mb-3">
            <label for="editRowNotes" class="form-label">Notes (Optional)</label>
            <input type="text" class="form-control" id="editRowNotes" value="${item.notes || ''}" 
                   maxlength="${CONFIG.MAX_NOTES_LENGTH}" placeholder="Optional notes">
        </div>
    `;
}

// Save row edit
export function saveRowEdit(index, programData, displayCallback) {
    const camera = document.getElementById('editRowCamera')?.value;
    const scene = document.getElementById('editRowScene')?.value;
    const mic = document.getElementById('editRowMic')?.value;
    const stream = document.getElementById('editRowStream')?.value;
    const notes = document.getElementById('editRowNotes')?.value;
    
    if (!camera || !scene || !mic) {
        showAlert('Please fill in Camera, Scene, and Mic fields', 'warning');
        return;
    }
    
    // Update the data
    programData[index].camera = camera;
    programData[index].scene = scene;
    programData[index].mic = mic;
    programData[index].stream = stream || '';
    programData[index].notes = notes;
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('missingInfoModal'));
    if (modal) modal.hide();
    
    // Refresh the table
    if (displayCallback) displayCallback();
    
    // Highlight the updated row
    setTimeout(() => {
        const row = document.getElementById(`row-${index}`);
        if (row) {
            addHighlightAnimation(row);
        }
    }, 100);
    
    showAlert('Row updated successfully!', 'success');
}

// Delete row
export function deleteRow(index, programData, displayCallback) {
    if (confirm('Are you sure you want to delete this item?')) {
        programData.splice(index, 1);
        if (displayCallback) displayCallback();
        showAlert('Item deleted successfully', 'success');
    }
}

// Add new row
export function addNewRow(programData, displayCallback) {
    const modalContent = document.getElementById('missingInfoContent');
    if (!modalContent) return;
    
    modalContent.innerHTML = createNewRowForm();

    // Update modal title and button
    const modalTitle = document.querySelector('#missingInfoModal .modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `
            <i class="fas fa-plus me-2"></i>Add New Item
        `;
    }
    
    // Change the save button to add new row
    const saveButton = document.querySelector('#missingInfoModal .btn-primary');
    if (saveButton) {
        saveButton.onclick = () => window.saveNewRow();
    }
    
    const modal = new bootstrap.Modal(document.getElementById('missingInfoModal'));
    modal.show();
}

// Create new row form HTML
function createNewRowForm() {
    const cameraTiles = FORM_OPTIONS.camera.map(option => `
        <div class="selection-tile" 
             data-value="${option.value}" 
             onclick="toggleRowTile(this, 'camera')">
            ${option.label}
        </div>
    `).join('');
    
    const sceneTiles = FORM_OPTIONS.scene.map(option => `
        <div class="selection-tile" 
             data-value="${option.value}" 
             onclick="toggleRowTile(this, 'scene')">
            ${option.label}
        </div>
    `).join('');
    
    return `
        <div class="mb-3">
            <label for="newRowItem" class="form-label">Program Item</label>
            <input type="text" class="form-control" id="newRowItem" 
                   placeholder="Enter program item description" maxlength="${CONFIG.MAX_PROGRAM_ITEM_LENGTH}">
        </div>
        
        <div class="row">
            <div class="col-md-4 mb-3">
                <label class="form-label">Camera</label>
                <div class="tile-container" id="newRowCameraTiles">
                    ${cameraTiles}
                </div>
                <input type="hidden" id="newRowCamera" value="">
                <!-- Camera 2 sub-options for new row -->
                <div class="mt-2" id="newRowCameraSubsContainer" style="display:none;">
                    <small class="text-muted">Camera 2 presets (select one or more)</small>
                    <div class="tile-container mt-1" id="newRowCameraSubs">
                        ${[1,2,3,4,5,6,7,8,9,'0'].map(n => `
                            <div class="selection-tile" data-value="${n}" onclick="window.toggleNewRowSubTile(this)">${n}</div>
                        `).join('')}
                    </div>
                </div>
                <input type="hidden" id="newRowCameraSubsValue" value="">
            </div>
            
            <div class="col-md-4 mb-3">
                <label class="form-label">Scene</label>
                <div class="tile-container" id="newRowSceneTiles">
                    ${sceneTiles}
                </div>
                <input type="hidden" id="newRowScene" value="">
            </div>
            
            <div class="col-md-4 mb-3">
                <label for="newRowMic" class="form-label">Mic</label>
                <input type="text" class="form-control" id="newRowMic" 
                       maxlength="${CONFIG.MAX_MIC_LENGTH}" placeholder="e.g., Lectern, Amb, 2,3,4">
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="newRowStream" class="form-label">Stream</label>
                <select class="form-select" id="newRowStream">
                    <option value="">None</option>
                    <option value="1">1 (Go Live + YouTube)</option>
                    <option value="2">2 (Go Live)</option>
                </select>
            </div>
            
            <div class="col-md-6 mb-3">
                <label for="newRowNotes" class="form-label">Notes (Optional)</label>
                <input type="text" class="form-control" id="newRowNotes" 
                       maxlength="${CONFIG.MAX_NOTES_LENGTH}" placeholder="Optional notes">
            </div>
        </div>
    `;
}

// Save new row
export function saveNewRow(programData, displayCallback) {
    const item = document.getElementById('newRowItem')?.value.trim();
    const camera = document.getElementById('newRowCamera')?.value;
    const scene = document.getElementById('newRowScene')?.value;
    const mic = document.getElementById('newRowMic')?.value.trim();
    const stream = document.getElementById('newRowStream')?.value || '';
    const notes = document.getElementById('newRowNotes')?.value.trim();
    
    if (!item || !camera || !scene || !mic) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Create new item
    const newItem = {
        id: programData.length,
        programItem: item,
        camera: camera,
        scene: scene,
        mic: mic,
        stream: stream,
        notes: notes
    };
    
    // Validate the new item
    const validation = validateProgramItem(newItem);
    if (!validation.valid) {
        showAlert('Validation errors: ' + validation.errors.join(', '), 'warning');
        return;
    }
    
    // Add to data
    programData.push(newItem);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('missingInfoModal'));
    if (modal) modal.hide();
    
    // Refresh the table
    if (displayCallback) displayCallback();
    
    showAlert('New item added successfully!', 'success');
}

// Toggle tile selection for camera/scene
export function toggleTile(tileElement, field, index) {
    const container = tileElement.parentElement;
    const hiddenInput = document.getElementById(`edit-${field}-${index}`);
    const value = tileElement.dataset.value;
    
            if (field === 'camera') {
                // For camera, allow multiple selection (like "2/1") with order preservation
                handleCameraTileToggle(tileElement, container, hiddenInput, value);
        // If camera 2 is involved, show/hide subs container
        try {
            // Support both editRow and newRow modal variants
            const subsContainerEdit = document.getElementById('editRowCameraSubsContainer');
            const subsInputEdit = document.getElementById('editRowCameraSubsValue');
            const subsContainerNew = document.getElementById('newRowCameraSubsContainer');
            const subsInputNew = document.getElementById('newRowCameraSubsValue');
            const currentValue = hiddenInput.value || '';
            const parsedCurr = parseComposedCamera(currentValue);
            const showSubs = parsedCurr.primaries.includes('2');

            if (subsContainerEdit) subsContainerEdit.style.display = showSubs ? 'block' : 'none';
            if (subsContainerNew) subsContainerNew.style.display = showSubs ? 'block' : 'none';

            // Inline per-row subs container
            try {
                const inlineSubsContainer = document.getElementById(`inlineCameraSubs-${index}`);
                if (inlineSubsContainer) inlineSubsContainer.style.display = showSubs ? 'block' : 'none';
            } catch (e) {
                // ignore
            }

            if (!showSubs) {
                if (subsInputEdit) subsInputEdit.value = '';
                if (subsInputNew) subsInputNew.value = '';
                const subsTilesEdit = document.querySelectorAll('#editRowCameraSubs .selection-tile');
                subsTilesEdit.forEach(t => t.classList.remove('selected'));
                const subsTilesNew = document.querySelectorAll('#newRowCameraSubs .selection-tile');
                subsTilesNew.forEach(t => t.classList.remove('selected'));
                // Also clear inline subs (the small per-row inline editor)
                try {
                    const inlineSubsContainer = document.getElementById(`inlineCameraSubs-${index}`);
                    const inlineSubsInput = document.getElementById(`edit-${field}-${index}-subs`);
                    if (inlineSubsContainer) inlineSubsContainer.style.display = 'none';
                    if (inlineSubsInput) inlineSubsInput.value = '';
                    const inlineTiles = document.querySelectorAll(`#inlineCameraSubsTiles-${index} .selection-tile`);
                    inlineTiles.forEach(t => t.classList.remove('selected'));
                } catch (e) {
                    // ignore
                }
            }
        } catch (e) {
            // ignore
        }
    } else if (field === 'scene') {
        // For scene, allow multiple selection (like "2/1") with order preservation
        handleSceneTileToggle(tileElement, container, hiddenInput, value);
    }
}

// Toggle a sub-tile inside the inline (per-row) quick editor for camera 2
function toggleInlineSubTile(tile, index) {
    try {
        tile.classList.toggle('selected');

        const subsTiles = document.querySelectorAll(`#inlineCameraSubsTiles-${index} .selection-tile.selected`);
        const values = Array.from(subsTiles).map(t => String(t.dataset.value));
        values.sort((a,b) => parseInt(a,10) - parseInt(b,10));
        const subsInput = document.getElementById(`edit-camera-${index}-subs`);
        if (subsInput) subsInput.value = values.join('/');

        // Update main camera hidden input composition for this inline editor
        const hiddenInput = document.getElementById(`edit-camera-${index}`);
        const container = document.getElementById(`tiles-camera-${index}`);
        if (!hiddenInput || !container) return;

        const selectedTiles = container.querySelectorAll('.selection-tile.selected');
        const primaries = Array.from(selectedTiles).map(t => t.dataset.value);
        // Keep the original selection order where possible
        // Compose value: if '2' present and subsInput has values, use `2 (subs)`
        const composed = primaries.map(v => v === '2' && subsInput && subsInput.value ? `2 (${subsInput.value})` : v).join(' / ');
        hiddenInput.value = composed;
    } catch (e) {
        console.warn('[toggleInlineSubTile] error', e);
    }
}

// Expose inline sub toggle globally for onclick handlers in generated HTML
try { window.toggleInlineSubTile = toggleInlineSubTile; } catch (e) {}

// Toggle a sub-tile inside the row-edit modal (Camera 2 presets)
function toggleRowSubTile(tile) {
    tile.classList.toggle('selected');

    const subsTiles = document.querySelectorAll('#editRowCameraSubs .selection-tile.selected');
    const values = Array.from(subsTiles).map(t => String(t.dataset.value));
    values.sort((a,b) => parseInt(a,10) - parseInt(b,10));
    const subsInput = document.getElementById('editRowCameraSubsValue');
    if (subsInput) subsInput.value = values.join('/');

    // Update main camera hidden input composition
    const hiddenInput = document.getElementById('editRowCamera');
    const container = document.getElementById('editRowCameraTiles');
    const selectedTiles = container.querySelectorAll('.selection-tile.selected');
    const primaries = Array.from(selectedTiles).map(t => t.dataset.value);
    primaries.sort((a,b) => parseInt(a)-parseInt(b));

    const composed = primaries.map(v => v === '2' && subsInput && subsInput.value ? `2 (${subsInput.value})` : v).join(' / ');
    if (hiddenInput) hiddenInput.value = composed;
}

// Expose row sub-tile toggle globally
try { window.toggleRowSubTile = toggleRowSubTile; } catch (e) {}

// Toggle a sub-tile inside the new-row modal (Camera 2 presets)
function toggleNewRowSubTile(tile) {
    tile.classList.toggle('selected');

    const subsTiles = document.querySelectorAll('#newRowCameraSubs .selection-tile.selected');
    const values = Array.from(subsTiles).map(t => String(t.dataset.value));
    values.sort((a,b) => parseInt(a,10) - parseInt(b,10));
    const subsInput = document.getElementById('newRowCameraSubsValue');
    if (subsInput) subsInput.value = values.join('/');

    // Update main camera hidden input composition
    const hiddenInput = document.getElementById('newRowCamera');
    const container = document.getElementById('newRowCameraTiles');
    const selectedTiles = container.querySelectorAll('.selection-tile.selected');
    const primaries = Array.from(selectedTiles).map(t => t.dataset.value);
    primaries.sort((a,b) => parseInt(a)-parseInt(b));

    const composed = primaries.map(v => v === '2' && subsInput && subsInput.value ? `2 (${subsInput.value})` : v).join(' / ');
    if (hiddenInput) hiddenInput.value = composed;
}

// Expose new-row sub-tile toggle globally
try { window.toggleNewRowSubTile = toggleNewRowSubTile; } catch (e) {}

function handleCameraTileToggle(tileElement, container, hiddenInput, value) {
    const isSelected = tileElement.classList.contains('selected');
    const currentValue = hiddenInput.value || '';
    const parsed = parseComposedCamera(currentValue);
    let primaries = parsed.primaries.slice();

    if (isSelected) {
        tileElement.classList.remove('selected');
        primaries = primaries.filter(p => p !== value);
    } else {
        tileElement.classList.add('selected');
        if (!primaries.includes(value)) primaries.push(value);
    }

    // Determine associated subs value if present (inline/editRow/newRow fields)
    let subs = '';
    try {
        const hid = hiddenInput.id || '';
        if (hid.startsWith('edit-camera-')) {
            const idx = hid.replace('edit-camera-', '');
            const subsInput = document.getElementById(`edit-camera-${idx}-subs`);
            if (subsInput) subs = subsInput.value.trim();
        } else if (hid === 'editRowCamera') {
            const subsInput = document.getElementById('editRowCameraSubsValue');
            if (subsInput) subs = subsInput.value.trim();
        } else if (hid === 'newRowCamera') {
            const subsInput = document.getElementById('newRowCameraSubsValue');
            if (subsInput) subs = subsInput.value.trim();
        }
    } catch (e) {
        // ignore
    }

    const composed = composeCameraFromPrimaries(primaries, subs);
    hiddenInput.value = composed;

    // Update visual state of all tiles
    updateTileStates(container, composed);

    // If camera 2 is not selected, proactively clear any Camera 2 subs UI/value to avoid stray subs
    if (!primaries.includes('2')) {
        try {
            // Inline editor case: edit-camera-<idx>-subs
            const hid = hiddenInput.id || '';
            if (hid.startsWith('edit-camera-')) {
                const idx = hid.replace('edit-camera-', '');
                const inlineSubsInput = document.getElementById(`edit-camera-${idx}-subs`);
                const inlineSubsContainer = document.getElementById(`inlineCameraSubs-${idx}`);
                const inlineTiles = document.querySelectorAll(`#inlineCameraSubsTiles-${idx} .selection-tile`);
                if (inlineSubsInput) inlineSubsInput.value = '';
                if (inlineSubsContainer) inlineSubsContainer.style.display = 'none';
                inlineTiles.forEach(t => t.classList.remove('selected'));
            }

            // Row edit and new row cases
            const subsInputEdit = document.getElementById('editRowCameraSubsValue');
            const subsContainerEdit = document.getElementById('editRowCameraSubsContainer');
            const subsTilesEdit = document.querySelectorAll('#editRowCameraSubs .selection-tile');
            if (subsInputEdit) subsInputEdit.value = '';
            if (subsContainerEdit) subsContainerEdit.style.display = 'none';
            subsTilesEdit.forEach(t => t.classList.remove('selected'));

            const subsInputNew = document.getElementById('newRowCameraSubsValue');
            const subsContainerNew = document.getElementById('newRowCameraSubsContainer');
            const subsTilesNew = document.querySelectorAll('#newRowCameraSubs .selection-tile');
            if (subsInputNew) subsInputNew.value = '';
            if (subsContainerNew) subsContainerNew.style.display = 'none';
            subsTilesNew.forEach(t => t.classList.remove('selected'));
        } catch (e) {
            // ignore any DOM errors
        }
    }
}

function handleSceneTileToggle(tileElement, container, hiddenInput, value) {
    const isSelected = tileElement.classList.contains('selected');
    const currentValue = hiddenInput.value;
    
    if (isSelected) {
        // Remove this value while preserving order of remaining values
        tileElement.classList.remove('selected');
        
        if (currentValue.includes('/')) {
            // Handle combined values like "2/1" - preserve order of remaining
            const parts = currentValue.split('/');
            const remaining = parts.filter(part => part !== value);
            hiddenInput.value = remaining.length > 0 ? remaining.join('/') : '';
        } else {
            hiddenInput.value = currentValue === value ? '' : currentValue;
        }
    } else {
        // Add this value in the order selected
        tileElement.classList.add('selected');
        
        if (currentValue && currentValue !== value) {
            // Append new value to existing (preserve selection order)
            // If "2" is selected first, then "1" selected, result is "2/1"
            hiddenInput.value = currentValue + '/' + value;
        } else {
            hiddenInput.value = value;
        }
    }
    
    // Update visual state of all tiles
    updateTileStates(container, hiddenInput.value);
}

function updateTileStates(container, currentValue) {
    // Use parsing to determine which primary tiles should be selected (avoid matching subs)
    const parsed = parseComposedCamera(currentValue || '');
    const values = parsed.primaries || [];

    container.querySelectorAll('.selection-tile').forEach(tile => {
        const tileValue = tile.dataset.value;
        if (values.includes(tileValue)) {
            tile.classList.add('selected');
        } else {
            tile.classList.remove('selected');
        }
    });
}

// Toggle tile selection in row edit modal
export function toggleRowTile(tileElement, field) {
    const container = tileElement.parentElement;
    const value = tileElement.dataset.value;
    
    // Determine if this is for editing existing row or adding new row
    let hiddenInput = document.getElementById(`editRow${field.charAt(0).toUpperCase() + field.slice(1)}`);
    if (!hiddenInput) {
        hiddenInput = document.getElementById(`newRow${field.charAt(0).toUpperCase() + field.slice(1)}`);
    }
    
    if (!hiddenInput) {
        console.error('Could not find hidden input for field:', field);
        return;
    }
    
    if (field === 'camera') {
        // For camera, allow multiple selection (like "2/1") with order preservation
        handleCameraTileToggle(tileElement, container, hiddenInput, value);
    } else if (field === 'scene') {
        // For scene, allow multiple selection (like "2/1") with order preservation
        handleSceneTileToggle(tileElement, container, hiddenInput, value);
    }
}

// end of editing module
