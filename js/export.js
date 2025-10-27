// Export functionality for the Church Program Smart Assistant

import { CONFIG } from './config.js';
import { AUTO_FILL_RULES } from './config.js';
import { showAlert, showLoadingSpinner, hideLoadingSpinner, downloadFile, formatDate } from './utils.js';
import { getAILearning } from './autoFill.js';

// Export to PDF
export async function exportToPDF(programData, isThirdSunday) {
    if (programData.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }

    // Do not show the global loading spinner here. We render a single export overlay
    // with its own spinner and progress bar so users only see one control.
    try { const existingSpinner = document.getElementById('loadingSpinner'); if (existingSpinner) existingSpinner.remove(); } catch (e) {}

    try {
        // Create PDF content
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Define colors for different fields
        const colors = {
            camera: { r: 0, g: 123, b: 255 },     // Blue (matches bg-primary)
            // Use a distinct, colorful hue for Scene rather than neutral gray so it
            // stands out in the exported PDF (rounded rectangle below).
            scene: { r: 108, g: 48, b: 237 },     // Purple-ish (was gray)
            mic: { r: 25, g: 135, b: 84 },        // Green (matches bg-success)
            stream: { r: 13, g: 202, b: 240 },    // Cyan (matches bg-info)
            notes: { r: 255, g: 193, b: 7 }       // Yellow (matches bg-warning)
        };
        
        // Calculate dynamic sizing - guaranteed fit with maximum possible size
        const itemCount = programData.length;
        const availableHeight = 235; // Available height for content
        
        // Calculate optimal row height that guarantees all items fit
        const totalRows = itemCount;
        const maxPossibleRowHeight = availableHeight / totalRows;
        
        // Constrain row height to reasonable bounds and ensure shapes fit
        const baseRowHeight = Math.max(8, Math.min(16, maxPossibleRowHeight));
        
        // Scale font and shapes proportionally to row height, with stricter limits
        const fontSize = Math.max(5, Math.min(9, baseRowHeight * 0.5));
        const shapeSize = Math.max(2, Math.min(4, baseRowHeight * 0.25));
        
        // Ensure shapes never exceed row height bounds
        const maxShapeHeight = shapeSize * 2.4; // Maximum shape height
        const safeRowHeight = Math.max(baseRowHeight, maxShapeHeight + 2); // Ensure shapes fit with padding
        
        const maxRowHeight = safeRowHeight;
        
        // Add title with styling
        doc.setFillColor(52, 58, 64); // Dark background
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255); // White text
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Church Program Schedule', 20, 16);
        
        // Add date and 3rd Sunday info
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const date = formatDate();
        doc.text(`Generated: ${date}`, 20, 22);
        doc.text(`3rd Sunday: ${isThirdSunday ? 'Yes' : 'No'}`, 120, 22);
        
        // Reset text color for content
        doc.setTextColor(0, 0, 0);
        
        // Add compact legend
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Legend:', 12, 35);
        
    // Camera legend (dark blue rounded rectangle)
    doc.setFillColor(19, 59, 102); // dark blue
    doc.roundedRect(28, 31, 4, 4, 0.6, 0.6, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text('Camera', 35, 35);
        
    // Scene legend (rounded rectangle with distinct color)
    doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
    doc.roundedRect(62, 31, 4, 4, 0.6, 0.6, 'F');
    doc.text('Scene', 68, 35);
        
        // Mic legend (rounded rectangle - changed from triangle)
        doc.setFillColor(colors.mic.r, colors.mic.g, colors.mic.b);
        doc.roundedRect(89, 31, 6, 4, 0.5, 0.5, 'F');
        doc.text('Mic', 97, 35);
        
        // Stream legend (rounded rectangle)
        doc.setFillColor(colors.stream.r, colors.stream.g, colors.stream.b);
        doc.roundedRect(110, 31, 6, 4, 0.5, 0.5, 'F');
        doc.text('Stream: 1=YouTube, 2=Live', 118, 35);
        
        // Notes legend (rounded rectangle)
        doc.setFillColor(colors.notes.r, colors.notes.g, colors.notes.b);
        doc.roundedRect(170, 31, 6, 4, 0.5, 0.5, 'F');
        doc.text('Notes', 178, 35);
        
        // Add table headers with background - wider to accommodate all columns
        const headerY = 44;
        doc.setFillColor(248, 249, 250); // Light gray background
        doc.rect(10, headerY, 190, 8, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Program Item', 12, headerY + 5);
        doc.text('Cam', 75, headerY + 5);
        doc.text('Scene', 95, headerY + 5);
        doc.text('Mic', 115, headerY + 5);
        doc.text('Stream', 140, headerY + 5);
        doc.text('Notes', 165, headerY + 5);
        
        // Add horizontal line
        doc.setLineWidth(0.3);
        doc.line(10, headerY + 8, 200, headerY + 8);
        
        // Add program info just below the table headers
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        const infoY = headerY + 12;
        doc.text('Generated by Church Program Smart Assistant', 10, infoY);
        doc.text(`Total Items: ${programData.length}`, 160, infoY);
        
        // Add data rows with enhanced styling - all on one page
        doc.setFont(undefined, 'normal');
        doc.setFontSize(fontSize);
        let yPosition = headerY + 18; // Start below the info line

        // Create a centered export progress overlay so users can see percent progress
        const exportOverlay = document.createElement('div');
        exportOverlay.id = 'exportProgressOverlay';
        exportOverlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1060;';
        exportOverlay.innerHTML = `
            <div style="background:rgba(0,0,0,0.65);color:#fff;padding:14px 18px;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:auto;min-width:220px;">
                <div style="display:flex;align-items:center;gap:12px;width:100%;justify-content:center;">
                    <div class="spinner-border spinner-border-sm text-light" role="status" style="width:1.25rem;height:1.25rem"><span class="visually-hidden">Loading...</span></div>
                    <div id="exportPercentText" style="font-weight:700;font-size:18px;min-width:48px;text-align:center;">0%</div>
                </div>
                <div style="width:100%;background:rgba(255,255,255,0.12);height:8px;border-radius:6px;overflow:hidden;">
                    <div id="exportProgressBarFill" style="width:0%;height:100%;background:linear-gradient(90deg,#0d6efd,#6dd5fa);transition:width 180ms linear;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(exportOverlay);

        // Iterate with an async loop so we can yield the event loop and let the browser repaint
        for (let index = 0; index < programData.length; index++) {
            const item = programData[index];
            // Calculate vertical center for all elements first
            const rowCenterY = yPosition + (maxRowHeight / 2);
            
            // Only add subtle alternating background if it won't interfere
            if (index % 2 === 0 && maxRowHeight > 12) {
                doc.setFillColor(254, 254, 254); // Very light gray, less intrusive
                doc.rect(10, yPosition - 1, 190, maxRowHeight - 2, 'F');
            }
            
            // Program item text with smart scaling, cleaning, and wrapping
            doc.setTextColor(0, 0, 0);
            let itemFontSize = fontSize;
            doc.setFontSize(itemFontSize);
            
            // Clean up the text - remove extra spaces and normalize whitespace
            let textToShow = item.programItem
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .trim();               // Remove leading/trailing spaces
            
            // More restrictive width to ensure no overflow into shapes
            const maxItemWidth = 55; // Reduced to accommodate more columns
            
            // Force line breaks - don't let text overflow
            let lines = doc.splitTextToSize(textToShow, maxItemWidth);
            
            // If text is too long, try smaller font first
            while (lines.length > 2 && itemFontSize > fontSize * 0.7) {
                itemFontSize -= 0.5;
                doc.setFontSize(itemFontSize);
                lines = doc.splitTextToSize(textToShow, maxItemWidth);
            }
            
            // If still too long after font scaling, truncate text more aggressively
            if (lines.length > 2) {
                // More aggressive truncation to prevent overflow
                const maxChars = Math.floor(maxItemWidth / (itemFontSize * 0.55)) * 2; // More conservative estimate
                if (textToShow.length > maxChars) {
                    // Look for break points near the max length
                    const breakPoints = [' ', ',', '-', '&', '(', ')'];
                    let truncateAt = maxChars - 1; // Leave room for potential break
                    
                    for (let i = truncateAt; i > maxChars * 0.6; i--) {
                        if (breakPoints.includes(textToShow[i])) {
                            truncateAt = i;
                            break;
                        }
                    }
                    
                    textToShow = textToShow.substring(0, truncateAt).trim();
                    lines = doc.splitTextToSize(textToShow, maxItemWidth);
                }
            }
            
            // Limit to exactly 2 lines maximum
            const linesToShow = Math.min(2, lines.length);
            
            // Calculate starting Y to center the text block
            const lineHeight = itemFontSize * 0.85;
            const totalTextHeight = linesToShow * lineHeight;
            const textStartY = rowCenterY - (totalTextHeight / 2) + lineHeight;
            
            // Render each line, ensuring they don't exceed width
            for (let i = 0; i < linesToShow; i++) {
                let lineText = lines[i];
                
                // Double-check line width and make font smaller if necessary
                while (doc.getTextWidth(lineText) > maxItemWidth && itemFontSize > 4) {
                    itemFontSize -= 0.2;
                    doc.setFontSize(itemFontSize);
                }
                
                doc.text(lineText, 12, textStartY + (i * lineHeight));
            }
            
            // Reset font size for other elements
            doc.setFontSize(fontSize);
            
            // Camera with dark rounded-rectangle shape - constrained sizing to always fit
            const cameraX = 77;
            const cameraY = rowCenterY;
            // Make exported camera wider to match the mic width so it appears as a dark-blue
            // rounded rectangle roughly the same width as the green mic box.
            // Use the same sizing constraints as micWidth (but keep independent variable name)
            const cameraWidth = Math.min(shapeSize * 4.0, 25); // Wider, matches mic width limits
            const cameraHeight = Math.min(shapeSize * 1.8, maxRowHeight * 0.4); // Constrain to row height
            const camRectX = cameraX - (cameraWidth / 2);
            const camRectY = cameraY - (cameraHeight / 2);
            doc.setFillColor(19, 59, 102); // dark blue
            // Use a slightly larger corner radius to match the mic/stream rounded look
            doc.roundedRect(camRectX, camRectY, cameraWidth, cameraHeight, 1.5, 1.5, 'F');

            // Camera text - center inside rectangle
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let cameraText = item.camera;
            let cameraFontSize = Math.min(fontSize + 5, cameraHeight * 1.1);
            doc.setFontSize(cameraFontSize);

            // Make font smaller until text fits in rectangle
            const maxCameraWidth = cameraWidth - 4;
            while (doc.getTextWidth(cameraText) > maxCameraWidth && cameraFontSize > 6) {
                cameraFontSize--;
                doc.setFontSize(cameraFontSize);
            }

            // Center text in rectangle
            const cameraTextWidth = doc.getTextWidth(cameraText);
            doc.text(cameraText, camRectX + (cameraWidth / 2) - (cameraTextWidth / 2), camRectY + (cameraHeight / 2) + (cameraFontSize * 0.25));
            
            // Scene with rounded-rectangle shape - constrained sizing to always fit
            const sceneX = 95;
            const sceneY = rowCenterY - (Math.min(shapeSize * 1.0, maxRowHeight * 0.2));
            const sceneWidth = Math.min(shapeSize * 2.5, 15); // Constrain maximum width
            const sceneHeight = Math.min(shapeSize * 2.0, maxRowHeight * 0.4); // Constrain to row height
            doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
            // Rounded corners for consistency with other boxes
            doc.roundedRect(sceneX, sceneY, sceneWidth, sceneHeight, 1.5, 1.5, 'F');
            
            // Scene text - significantly increased font size to match camera
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let sceneText = item.scene;
            let sceneFontSize = Math.min(fontSize + 7, sceneHeight * 1.0); // Much larger font size
            doc.setFontSize(sceneFontSize);
            
            // Make font smaller until text fits in rectangle
            const maxSceneWidth = sceneWidth - 4;
            while (doc.getTextWidth(sceneText) > maxSceneWidth && sceneFontSize > 6) {
                sceneFontSize--;
                doc.setFontSize(sceneFontSize);
            }
            
            // Center text perfectly in rectangle with proper vertical alignment
            const sceneTextWidth = doc.getTextWidth(sceneText);
            doc.text(sceneText, 
                sceneX + (sceneWidth / 2) - (sceneTextWidth / 2), 
                sceneY + (sceneHeight / 2) + (sceneFontSize * 0.25)
            );
            
            // Mic with rounded rectangle shape - constrained sizing to always fit
            const micX = 115;
            const micY = rowCenterY - (Math.min(shapeSize * 1.0, maxRowHeight * 0.2));
            const micWidth = Math.min(shapeSize * 4.0, 25); // Constrain maximum width
            const micHeight = Math.min(shapeSize * 2.0, maxRowHeight * 0.4); // Constrain to row height
            doc.setFillColor(colors.mic.r, colors.mic.g, colors.mic.b);
            doc.roundedRect(micX, micY, micWidth, micHeight, 1.5, 1.5, 'F');
            
            // Mic text - significantly increased font size to match camera
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let micText = item.mic;
            let micFontSize = Math.min(fontSize + 6, micHeight * 1.0); // Much larger font size
            doc.setFontSize(micFontSize);
            
            // Make font smaller until text fits in rectangle
            const maxMicWidth = micWidth - 4;
            while (doc.getTextWidth(micText) > maxMicWidth && micFontSize > 6) {
                micFontSize--;
                doc.setFontSize(micFontSize);
            }
            
            // Center text perfectly in rectangle with proper vertical alignment
            const micTextWidth = doc.getTextWidth(micText);
            doc.text(micText, micX + (micWidth / 2) - (micTextWidth / 2), micY + (micHeight / 2) + (micFontSize * 0.25));
            
            // Stream with rounded rectangle (if exists) - constrained sizing to always fit
            if (item.stream && item.stream.trim()) {
                const streamX = 140;
                const streamY = rowCenterY - (Math.min(shapeSize * 1.0, maxRowHeight * 0.2));
                const streamWidth = Math.min(shapeSize * 3.0, 18); // Constrain maximum width
                const streamHeight = Math.min(shapeSize * 2.0, maxRowHeight * 0.4); // Constrain to row height
                doc.setFillColor(colors.stream.r, colors.stream.g, colors.stream.b);
                doc.roundedRect(streamX, streamY, streamWidth, streamHeight, 1.5, 1.5, 'F');
                
                // Stream text - significantly increased font size to match camera
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                let streamText = item.stream;
                let streamFontSize = Math.min(fontSize + 6, streamHeight * 1.0); // Much larger font size
                doc.setFontSize(streamFontSize);
                
                // Make font smaller until text fits in rectangle
                const maxStreamWidth = streamWidth - 4;
                while (doc.getTextWidth(streamText) > maxStreamWidth && streamFontSize > 6) {
                    streamFontSize--;
                    doc.setFontSize(streamFontSize);
                }
                
                // Center text perfectly in rectangle with proper vertical alignment
                const streamTextWidth = doc.getTextWidth(streamText);
                doc.text(streamText, streamX + (streamWidth / 2) - (streamTextWidth / 2), streamY + (streamHeight / 2) + (streamFontSize * 0.25));
            }
            
            // Notes with rounded rectangle (if exists) - dynamic text scaling
            if (item.notes && item.notes.trim()) {
                const notesX = 165;
                const notesY = rowCenterY - (Math.min(shapeSize * 1.0, maxRowHeight * 0.2));
                const notesWidth = Math.min(shapeSize * 8.0, 30); // Constrain maximum width
                const notesHeight = Math.min(shapeSize * 2.0, maxRowHeight * 0.4); // Constrain to row height
                
                // Notes text - single line (input already limited to 25 characters)
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'normal');
                
                // Clean up the notes text (no truncation needed - input is limited)
                let cleanNotes = item.notes.replace(/\s+/g, ' ').trim();
                const maxNotesTextWidth = notesWidth - 6; // Reduced margin for more space
                
                // Dynamic font sizing - start large and scale down if needed
                let notesFontSize = Math.min(fontSize + 8, notesHeight * 0.8); // Start with larger font
                doc.setFontSize(notesFontSize);
                
                // Scale down font size until text fits perfectly
                while (doc.getTextWidth(cleanNotes) > maxNotesTextWidth && notesFontSize > 4) {
                    notesFontSize -= 0.3; // Smaller decrements for finer control
                    doc.setFontSize(notesFontSize);
                }
                
                // For very short text (1-3 characters), allow even larger font
                if (cleanNotes.length <= 3) {
                    let largeFontSize = Math.min(fontSize + 12, notesHeight * 0.9);
                    doc.setFontSize(largeFontSize);
                    
                    // Check if the large font still fits
                    if (doc.getTextWidth(cleanNotes) <= maxNotesTextWidth) {
                        notesFontSize = largeFontSize;
                    } else {
                        // Scale back down if too large
                        doc.setFontSize(notesFontSize);
                    }
                }
                
                // For medium text (4-8 characters), use medium large font
                else if (cleanNotes.length <= 8) {
                    let mediumFontSize = Math.min(fontSize + 10, notesHeight * 0.85);
                    doc.setFontSize(mediumFontSize);
                    
                    // Check if the medium font still fits
                    if (doc.getTextWidth(cleanNotes) <= maxNotesTextWidth) {
                        notesFontSize = mediumFontSize;
                    } else {
                        // Scale back down if too large
                        doc.setFontSize(notesFontSize);
                    }
                }
                
                // Draw the notes box
                doc.setFillColor(colors.notes.r, colors.notes.g, colors.notes.b);
                doc.roundedRect(notesX, notesY, notesWidth, notesHeight, 1.5, 1.5, 'F');
                
                // Center the single line of text vertically and horizontally
                if (cleanNotes) {
                    const lineWidth = doc.getTextWidth(cleanNotes);
                    const textX = notesX + (notesWidth / 2) - (lineWidth / 2);
                    const textY = notesY + (notesHeight / 2) + (notesFontSize * 0.3);
                    doc.text(cleanNotes, textX, textY);
                }
            }
            
            // Reset for next row
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(fontSize);
            yPosition += maxRowHeight;

            // Update progress overlay percent and yield briefly to allow repaint
            try {
                const percent = Math.round(((index + 1) / programData.length) * 100);
                const pctEl = document.getElementById('exportPercentText');
                const fillEl = document.getElementById('exportProgressBarFill');
                if (pctEl) pctEl.textContent = `${percent}%`;
                if (fillEl) fillEl.style.width = `${percent}%`;
            } catch (e) {
                // ignore DOM update errors
            }

            // Small yield to allow UI to update (especially important on mobile)
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // AI Learning: User exported PDF - learn from all final configurations
        await learnFromPDFExport(programData, isThirdSunday);
        
    // Remove the export overlay and hide spinner and give the browser a short moment to update the UI before starting download
    try { const ol = document.getElementById('exportProgressOverlay'); if (ol) ol.remove(); } catch (e) {}
    hideLoadingSpinner();
    // Small yield so mobile browsers can show download UI / allow UI thread to update
    await new Promise(resolve => setTimeout(resolve, 120));
    // Save the PDF (may trigger browser download prompt)
    doc.save(CONFIG.PDF_FILENAME);
    showAlert('PDF exported successfully!', 'success');
        
    } catch (error) {
        try { const ol = document.getElementById('exportProgressOverlay'); if (ol) ol.remove(); } catch (e) {}
        showAlert('Error exporting PDF: ' + error.message, 'danger');
        console.error('PDF export error:', error);
    }
}

// Export to JSON with separate file
export function exportToJSON(programData, isThirdSunday) {
    if (programData.length === 0) {
        showAlert('No data to save', 'warning');
        return;
    }

    try {
        const exportData = createJSONExport(programData, isThirdSunday);
        
        // Save to separate JSON file
        downloadFile(
            JSON.stringify(exportData, null, 2), 
            CONFIG.JSON_FILENAME, 
            'application/json'
        );
        
        showAlert('JSON file saved successfully!', 'success');
        
    } catch (error) {
        showAlert('Error saving JSON: ' + error.message, 'danger');
        console.error('JSON export error:', error);
    }
}

// Create structured JSON export data
function createJSONExport(programData, isThirdSunday) {
    return {
        metadata: {
            version: CONFIG.APP_VERSION,
            exportDate: new Date().toISOString(),
            generatedBy: 'Church Program Smart Assistant',
            isThirdSunday: isThirdSunday,
            totalItems: programData.length
        },
        settings: {
            thirdSundayMode: isThirdSunday
        },
        programData: programData.map((item, index) => ({
            id: index + 1,
            programItem: item.programItem,
            techSettings: {
                camera: item.camera,
                scene: item.scene,
                mic: item.mic,
                stream: item.stream || ''
            },
            notes: item.notes || '',
            autoFilled: !item._isUnmatched // Check internal flag instead of notes content
        })),
        summary: {
            totalItems: programData.length,
            autoFilledItems: programData.filter(item => !item._isUnmatched).length,
            manualItems: programData.filter(item => item._isUnmatched).length
        }
    };
}

// Import from JSON
export function importFromJSON(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        // Validate JSON structure
        if (!validateJSONStructure(data)) {
            throw new Error('Invalid JSON structure');
        }
        
        // Extract program data
        let programData = [];
        let isThirdSunday = false;
        
        // Handle new format
        if (data.metadata && data.programData) {
            isThirdSunday = data.metadata.isThirdSunday || data.settings?.thirdSundayMode || false;
            programData = data.programData.map((item, index) => ({
                id: index,
                programItem: item.programItem,
                camera: item.techSettings?.camera || '',
                scene: item.techSettings?.scene || '',
                mic: item.techSettings?.mic || '',
                stream: item.techSettings?.stream || '',
                notes: item.notes || ''
            }));
            // Migrate legacy/saved camera info to new composed formats where applicable
            try {
                migrateSavedCameraInfo(programData);
            } catch (e) {
                console.warn('[Import] Camera migration failed:', e);
            }
        }
        // Handle legacy format
        else if (data.programData && data.isThirdSunday !== undefined) {
            programData = data.programData;
            isThirdSunday = data.isThirdSunday;
        }
        
        return {
            success: true,
            data: {
                programData,
                isThirdSunday,
                metadata: data.metadata || null
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Validate JSON structure
function validateJSONStructure(data) {
    // Check for new format
    if (data.metadata && data.programData) {
        return Array.isArray(data.programData) &&
               data.programData.every(item => 
                   item.programItem && 
                   item.techSettings
               );
    }
    
    // Check for legacy format
    if (data.programData && data.isThirdSunday !== undefined) {
        return Array.isArray(data.programData) &&
               data.programData.every(item => 
                   item.programItem && 
                   typeof item.camera !== 'undefined'
               );
    }
    
    return false;
}

// Migrate saved camera/mic info to new composed camera formats based on rules
function migrateSavedCameraInfo(programData) {
    if (!Array.isArray(programData)) return;

    const lcContains = (text, key) => (text || '').toLowerCase().includes((key || '').toLowerCase());
    const anyContains = (text, keys) => keys.some(k => lcContains(text, k));

    function cameraHasPrimary(cameraStr, primary) {
        if (!cameraStr) return false;
        const parts = cameraStr.split('/').map(p => p.trim());
        return parts.some(p => p === String(primary) || p.startsWith(String(primary) + ' ' ) || p.startsWith(String(primary) + '(') || p.startsWith(String(primary) + ' ('));
    }

    function composeWithSubs(primaries, subs) {
        // primaries: array of primary values (strings), subs: string like '6/7' or ''
        const out = primaries.map(p => {
            if (p === '2' && subs) return `2 (${subs})`;
            return p;
        });
        return out.join(' / ');
    }

    programData.forEach(item => {
        try {
            const text = (item.programItem || '').toLowerCase();
            const mic = (item.mic || '').toLowerCase();
            const cam = (item.camera || '').toString();

            // 1) Lectern + camera 4 -> keep 4 and add 2(4) as secondary
            if ((mic.includes('lectern') || mic.includes('lecturn')) && cameraHasPrimary(cam, '4')) {
                // ensure we don't duplicate
                if (!cameraHasPrimary(cam, '2')) {
                    item.camera = composeWithSubs(['4','2'], '4');
                } else if (!/\(\s*4\s*\)/.test(cam)) {
                    // if 2 exists but without subs, add 4 as subs
                    // collect primaries (keep order: 4 then 2)
                    item.camera = composeWithSubs(['4','2'], '4');
                }
                return; // mapping applied
            }

            // 2) YP Spot -> 2 (5)
            if (text.includes('yp spot') || text.includes('yp') || text.includes('youth') || text.includes('y p')) {
                item.camera = '2 (5)';
                return;
            }

            // 3) Benediction -> 2 (0)
            if (anyContains(text, ['benediction', 'closing prayer', 'closing'])) {
                item.camera = '2 (0)';
                return;
            }

            // 4) Piano -> 2 (2/3)
            if (text.includes('piano') || mic.includes('piano')) {
                item.camera = '2 (2/3)';
                return;
            }

            // 5) Band Message -> 2 (1/7/8/9)
            if (text.includes('band') && anyContains(text, ['message', 'band message'])) {
                item.camera = '2 (1/7/8/9)';
                return;
            }

            // 6) Band that was 2 before -> 2 (1)
            // Map band items to 2 (1) when they previously used camera 2 or when camera is empty but the item is clearly a band
            if (text.includes('band')) {
                if (cameraHasPrimary(cam, '2') || (!cam || cam.trim() === '')) {
                    item.camera = '2 (1)';
                    return;
                }
            }

            // 7) WG that used to be 2 -> 2 (6)
            if ((text.includes('wg') || text.includes('worship group') || text.includes('worship')) && cameraHasPrimary(cam, '2')) {
                item.camera = '2 (6)';
                return;
            }

            // default: leave unchanged
        } catch (e) {
            console.warn('[Migration] error migrating item:', item, e);
        }
    });
}

// Export summary statistics
export function generateSummaryReport(programData) {
    const totalItems = programData.length;
    const autoFilledItems = programData.filter(item => 
        !item._isUnmatched
    ).length;
    
    const cameraUsage = {};
    const sceneUsage = {};
    const micUsage = {};
    
    programData.forEach(item => {
        cameraUsage[item.camera] = (cameraUsage[item.camera] || 0) + 1;
        sceneUsage[item.scene] = (sceneUsage[item.scene] || 0) + 1;
        micUsage[item.mic] = (micUsage[item.mic] || 0) + 1;
    });
    
    return {
        totalItems,
        autoFilledItems,
        manualItems: totalItems - autoFilledItems,
        autoFillRate: totalItems > 0 ? (autoFilledItems / totalItems * 100).toFixed(1) : 0,
        usage: {
            camera: cameraUsage,
            scene: sceneUsage,
            mic: micUsage
        }
    };
}

// AI Learning: Learn from user's final configuration when they export PDF
async function learnFromPDFExport(programData, isThirdSunday) {
    try {
        const aiLearning = getAILearning();
        if (!aiLearning || !aiLearning.isInitialized) {
            console.log('[Learning] AI system not ready, skipping PDF export learning');
            return;
        }
        
        console.log(`[Learning] User exported PDF with ${programData.length} items - capturing final configurations for AI learning`);
        
        let learnedCount = 0;
        
        // Learn from each program item's final configuration
        for (const item of programData) {
            try {
                // Create the program item object for AI
                const programItem = {
                    title: item.programItem,
                    type: item._originalItem?.type || '',
                    performer: item._originalItem?.performer || '',
                    notes: item.notes || '',
                    index: item.id || 0
                };
                
                // Create the final user values
                const userValues = {
                    camera: item.camera || '',
                    scene: item.scene || '',
                    mic: item.mic || '',
                    notes: item.notes || '',
                    stream: item.stream || ''
                };
                
                // Context for learning
                const context = {
                    isThirdSunday: isThirdSunday || false,
                    source: 'pdf_export',
                    timestamp: new Date().toISOString(),
                    position: item.id || 0
                };
                
                // Get the AI predictions that were made initially (if any)
                const aiPredictions = item._aiPredictions || {};
                
                // Let the AI learn from this final configuration
                await aiLearning.learnFromFeedback(programItem, aiPredictions, userValues, context);
                
                learnedCount++;
                
            } catch (itemError) {
                console.warn(`[Learning] Could not learn from item "${item.programItem}":`, itemError);
            }
        }
        
        console.log(`[Learning] Successfully learned from ${learnedCount}/${programData.length} items in PDF export`);
        
        // Get updated AI status after learning
        const status = await aiLearning.getSystemStatus();
        if (status && status.performance) {
            console.log(`[Learning] AI Status after PDF export: Phase ${status.currentPhase}, ${status.performance.totalPredictions} total predictions`);
        } else {
            console.log(`[Learning] AI Status after PDF export: Phase ${status?.currentPhase || 'unknown'}, performance data not available`);
        }
        
    } catch (error) {
        console.error('[Learning] Error during PDF export learning:', error);
    }
}

// Export migration helper so other modules (like main) can call it on runtime data
export { migrateSavedCameraInfo };
