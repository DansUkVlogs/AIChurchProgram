// Export functionality for the Church Program Smart Assistant

import { CONFIG } from './config.js';
import { showAlert, showLoadingSpinner, hideLoadingSpinner, downloadFile, formatDate } from './utils.js';
import { getAILearning } from './autoFill.js';

// Export to PDF
export async function exportToPDF(programData, isThirdSunday) {
    if (programData.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }

    showLoadingSpinner();

    try {
        // Create PDF content
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Define colors for different fields
        const colors = {
            camera: { r: 0, g: 123, b: 255 },     // Blue (matches bg-primary)
            scene: { r: 108, g: 117, b: 125 },    // Gray (matches bg-secondary)  
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
        
        // Camera legend (circle)
        doc.setFillColor(colors.camera.r, colors.camera.g, colors.camera.b);
        doc.circle(30, 33, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text('Camera', 35, 35);
        
        // Scene legend (rectangle)
        doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
        doc.rect(62, 31, 4, 4, 'F');
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
        
        programData.forEach((item, index) => {
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
            
            // Camera with circle shape - constrained sizing to always fit
            const cameraX = 77;
            const cameraY = rowCenterY;
            const cameraRadius = Math.min(shapeSize * 1.0, maxRowHeight * 0.25); // Constrain to row height
            doc.setFillColor(colors.camera.r, colors.camera.g, colors.camera.b);
            doc.circle(cameraX, cameraY, cameraRadius, 'F');
            
            // Camera text - slightly increased font size for better readability
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let cameraText = item.camera;
            let cameraFontSize = Math.min(fontSize + 5, cameraRadius * 2.2); // Slightly increased
            doc.setFontSize(cameraFontSize);
            
            // Make font smaller until text fits in circle
            const maxCameraWidth = cameraRadius * 1.4;
            while (doc.getTextWidth(cameraText) > maxCameraWidth && cameraFontSize > 6) {
                cameraFontSize--;
                doc.setFontSize(cameraFontSize);
            }
            
            // Center text perfectly in circle with proper vertical alignment
            const cameraTextWidth = doc.getTextWidth(cameraText);
            doc.text(cameraText, cameraX - (cameraTextWidth / 2), cameraY + (cameraFontSize * 0.25));
            
            // Scene with rectangle shape - constrained sizing to always fit
            const sceneX = 95;
            const sceneY = rowCenterY - (Math.min(shapeSize * 1.0, maxRowHeight * 0.2));
            const sceneWidth = Math.min(shapeSize * 2.5, 15); // Constrain maximum width
            const sceneHeight = Math.min(shapeSize * 2.0, maxRowHeight * 0.4); // Constrain to row height
            doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
            doc.rect(sceneX, sceneY, sceneWidth, sceneHeight, 'F');
            
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
        });
        
        // AI Learning: User exported PDF - learn from all final configurations
        await learnFromPDFExport(programData, isThirdSunday);
        
        // Save the PDF
        doc.save(CONFIG.PDF_FILENAME);
        hideLoadingSpinner();
        showAlert('PDF exported successfully!', 'success');
        
    } catch (error) {
        hideLoadingSpinner();
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

