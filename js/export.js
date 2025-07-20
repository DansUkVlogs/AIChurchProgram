// Export functionality for the Church Program Smart Assistant

import { CONFIG } from './config.js';
import { showAlert, showLoadingSpinner, hideLoadingSpinner, downloadFile, formatDate } from './utils.js';

// Export to PDF
export function exportToPDF(programData, isThirdSunday) {
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
            notes: { r: 255, g: 193, b: 7 }       // Yellow (matches bg-warning)
        };
        
        // Calculate dynamic sizing based on number of items - more aggressive scaling
        const itemCount = programData.length;
        const availableHeight = 235; // Available height for content
        
        // More aggressive scaling for larger programs
        let baseRowHeight, fontSize, shapeSize;
        if (itemCount <= 10) {
            baseRowHeight = Math.max(16, Math.min(20, availableHeight / (itemCount + 3)));
            fontSize = Math.max(9, Math.min(12, baseRowHeight * 0.5));
            shapeSize = Math.max(5, Math.min(7, baseRowHeight * 0.3));
        } else if (itemCount <= 15) {
            baseRowHeight = Math.max(13, Math.min(16, availableHeight / (itemCount + 3)));
            fontSize = Math.max(8, Math.min(10, baseRowHeight * 0.5));
            shapeSize = Math.max(4, Math.min(6, baseRowHeight * 0.3));
        } else if (itemCount <= 20) {
            baseRowHeight = Math.max(11, Math.min(14, availableHeight / (itemCount + 3)));
            fontSize = Math.max(7, Math.min(9, baseRowHeight * 0.5));
            shapeSize = Math.max(3, Math.min(5, baseRowHeight * 0.3));
        } else {
            // For very large programs, use minimal spacing
            baseRowHeight = Math.max(9, availableHeight / (itemCount + 3));
            fontSize = Math.max(6, baseRowHeight * 0.5);
            shapeSize = Math.max(2.5, baseRowHeight * 0.3);
        }
        
        const maxRowHeight = baseRowHeight * 1.05; // Reduce gap between rows
        
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
        doc.text('Legend:', 20, 32);
        
        // Camera legend (circle)
        doc.setFillColor(colors.camera.r, colors.camera.g, colors.camera.b);
        doc.circle(35, 33, 2, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text('Camera', 40, 35);
        
        // Scene legend (rectangle)
        doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
        doc.rect(65, 31, 4, 4, 'F');
        doc.text('Scene', 71, 35);
        
        // Mic legend (rounded rectangle - changed from triangle)
        doc.setFillColor(colors.mic.r, colors.mic.g, colors.mic.b);
        doc.roundedRect(92, 31, 6, 4, 0.5, 0.5, 'F');
        doc.text('Mic', 100, 35);
        
        // Notes legend (rounded rectangle)
        doc.setFillColor(colors.notes.r, colors.notes.g, colors.notes.b);
        doc.roundedRect(125, 31, 6, 4, 0.5, 0.5, 'F');
        doc.text('Notes', 134, 35);
        
        // Add table headers with background
        const headerY = 44;
        doc.setFillColor(248, 249, 250); // Light gray background
        doc.rect(20, headerY, 170, 8, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Program Item', 22, headerY + 5);
        doc.text('Camera', 90, headerY + 5);
        doc.text('Scene', 115, headerY + 5);
        doc.text('Mic', 140, headerY + 5);
        doc.text('Notes', 165, headerY + 5);
        
        // Add horizontal line
        doc.setLineWidth(0.3);
        doc.line(20, headerY + 8, 190, headerY + 8);
        
        // Add data rows with enhanced styling - all on one page
        doc.setFont(undefined, 'normal');
        doc.setFontSize(fontSize);
        let yPosition = headerY + 16;
        
        programData.forEach((item, index) => {
            // Calculate vertical center for all elements first
            const rowCenterY = yPosition + (maxRowHeight / 2);
            
            // Only add subtle alternating background if it won't interfere
            if (index % 2 === 0 && maxRowHeight > 12) {
                doc.setFillColor(254, 254, 254); // Very light gray, less intrusive
                doc.rect(20, yPosition - 1, 170, maxRowHeight - 2, 'F');
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
            const maxItemWidth = 60; // Reduced from 65 to prevent overflow
            
            // Force line breaks - don't let text overflow
            let lines = doc.splitTextToSize(textToShow, maxItemWidth);
            
            // If text is too long, try smaller font first
            while (lines.length > 2 && itemFontSize > fontSize * 0.7) {
                itemFontSize -= 0.5;
                doc.setFontSize(itemFontSize);
                lines = doc.splitTextToSize(textToShow, maxItemWidth);
            }
            
            // If still too long after font scaling, truncate text intelligently
            if (lines.length > 2) {
                // More aggressive truncation to prevent overflow
                const maxChars = Math.floor(maxItemWidth / (itemFontSize * 0.55)) * 2; // More conservative estimate
                if (textToShow.length > maxChars) {
                    // Look for break points near the max length
                    const breakPoints = [' ', ',', '-', '&', '(', ')'];
                    let truncateAt = maxChars - 3; // Leave room for "..."
                    
                    for (let i = truncateAt; i > maxChars * 0.6; i--) {
                        if (breakPoints.includes(textToShow[i])) {
                            truncateAt = i;
                            break;
                        }
                    }
                    
                    textToShow = textToShow.substring(0, truncateAt).trim() + '...';
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
                
                // Double-check line width and truncate if necessary
                while (doc.getTextWidth(lineText) > maxItemWidth && lineText.length > 10) {
                    lineText = lineText.substring(0, lineText.length - 4) + '...';
                }
                
                doc.text(lineText, 22, textStartY + (i * lineHeight));
            }
            
            // Reset font size for other elements
            doc.setFontSize(fontSize);
            
            // Camera with circle shape - perfectly centered
            const cameraX = 92;
            const cameraY = rowCenterY;
            const cameraRadius = shapeSize * 1.3; // Larger circle for better readability
            doc.setFillColor(colors.camera.r, colors.camera.g, colors.camera.b);
            doc.circle(cameraX, cameraY, cameraRadius, 'F');
            
            // Camera text - maximized font size to fill the circle
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let cameraFontSize = Math.min(16, cameraRadius * 2.2); // Start with larger size
            doc.setFontSize(cameraFontSize);
            
            // Maximize font size while ensuring text fits comfortably in circle
            while (doc.getTextWidth(item.camera) > cameraRadius * 1.6 && cameraFontSize > 7) {
                cameraFontSize--;
                doc.setFontSize(cameraFontSize);
            }
            
            // Center text perfectly in circle with proper vertical alignment
            const cameraTextWidth = doc.getTextWidth(item.camera);
            doc.text(item.camera, cameraX - (cameraTextWidth / 2), cameraY + (cameraFontSize * 0.25));
            
            // Scene with rectangle shape - perfectly centered
            const sceneX = 115;
            const sceneY = rowCenterY - (shapeSize * 1.2);
            const sceneWidth = shapeSize * 3.5; // Larger for better text space
            const sceneHeight = shapeSize * 2.4; // Taller for better text
            doc.setFillColor(colors.scene.r, colors.scene.g, colors.scene.b);
            doc.rect(sceneX, sceneY, sceneWidth, sceneHeight, 'F');
            
            // Scene text - maximized font size to fill the rectangle
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let sceneFontSize = Math.min(16, shapeSize * 2.2); // Start with larger size
            doc.setFontSize(sceneFontSize);
            
            // Maximize font size while ensuring text fits comfortably in rectangle
            while (doc.getTextWidth(item.scene) > sceneWidth - 6 && sceneFontSize > 7) {
                sceneFontSize--;
                doc.setFontSize(sceneFontSize);
            }
            
            // Center text perfectly in rectangle with proper vertical alignment
            const sceneTextWidth = doc.getTextWidth(item.scene);
            doc.text(item.scene, 
                sceneX + (sceneWidth / 2) - (sceneTextWidth / 2), 
                sceneY + (sceneHeight / 2) + (sceneFontSize * 0.25)
            );
            
            // Mic with rounded rectangle shape (instead of triangle) - perfectly centered
            const micX = 140;
            const micY = rowCenterY - (shapeSize * 1.2);
            const micWidth = shapeSize * 3.8; // Wider for better text space
            const micHeight = shapeSize * 2.4; // Taller for better text
            doc.setFillColor(colors.mic.r, colors.mic.g, colors.mic.b);
            doc.roundedRect(micX, micY, micWidth, micHeight, 1.5, 1.5, 'F');
            
            // Mic text - maximized font size for better readability
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            let micFontSize = Math.min(16, shapeSize * 2.0); // Start with larger size
            doc.setFontSize(micFontSize);
            
            // Split mic text into lines if needed, with more space now
            let micLines = [];
            const maxMicWidth = micWidth - 6; // Better margin inside rectangle
            
            if (doc.getTextWidth(item.mic) > maxMicWidth) {
                // Try to split on common delimiters
                if (item.mic.includes(',')) {
                    micLines = item.mic.split(',').map(s => s.trim());
                } else if (item.mic.includes('/')) {
                    micLines = item.mic.split('/').map(s => s.trim());
                } else if (item.mic.length > 8) {
                    // Split long text into 2 lines
                    const mid = Math.ceil(item.mic.length / 2);
                    micLines = [item.mic.substring(0, mid), item.mic.substring(mid)];
                } else {
                    micLines = [item.mic];
                }
            } else {
                micLines = [item.mic];
            }
            
            // Ensure each line fits and maximize font size
            const micLinesToShow = Math.min(2, micLines.length);
            for (let line of micLines.slice(0, micLinesToShow)) {
                while (doc.getTextWidth(line) > maxMicWidth && micFontSize > 6) {
                    micFontSize--;
                    doc.setFontSize(micFontSize);
                }
            }
            
            // Center text perfectly in rectangle with proper vertical alignment
            const lineSpacing = micFontSize * 1.15;
            const totalHeight = micLinesToShow * lineSpacing;
            const startY = micY + (micHeight / 2) - (totalHeight / 2) + (micFontSize * 0.75);
            
            for (let i = 0; i < micLinesToShow; i++) {
                const line = micLines[i];
                const lineWidth = doc.getTextWidth(line);
                doc.text(line, micX + (micWidth / 2) - (lineWidth / 2), startY + (i * lineSpacing));
            }
            
            // Notes with rounded rectangle (if exists) - perfectly centered
            if (item.notes && item.notes.trim()) {
                const notesX = 162;
                const notesY = rowCenterY - (shapeSize * 1.2);
                const notesWidth = shapeSize * 3.8; // Same width as mic box for consistency
                const notesHeight = shapeSize * 2.4; // Same height as mic box for consistency
                
                // Notes text - start with larger font and scale down to fit on one line first
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'normal');
                let notesFontSize = Math.min(16, shapeSize * 2.0); // Start with larger size
                doc.setFontSize(notesFontSize);
                
                // First try to fit on one line by reducing font size
                while (doc.getTextWidth(item.notes) > notesWidth - 6 && notesFontSize > 6) {
                    notesFontSize--;
                    doc.setFontSize(notesFontSize);
                }
                
                // If still too long after minimum font size, split into lines
                let notesLines = [];
                if (doc.getTextWidth(item.notes) > notesWidth - 6) {
                    notesLines = doc.splitTextToSize(item.notes, notesWidth - 6);
                } else {
                    notesLines = [item.notes];
                }
                
                const notesLinesToShow = Math.min(2, notesLines.length);
                
                // Ensure each line fits with the current font size
                for (let line of notesLines.slice(0, notesLinesToShow)) {
                    while (doc.getTextWidth(line) > notesWidth - 6 && notesFontSize > 6) {
                        notesFontSize--;
                        doc.setFontSize(notesFontSize);
                        // Re-split text with new font size
                        if (notesLines.length > 1) {
                            notesLines = doc.splitTextToSize(item.notes, notesWidth - 6);
                        }
                    }
                }
                
                // Draw the notes box with consistent sizing
                doc.setFillColor(colors.notes.r, colors.notes.g, colors.notes.b);
                doc.roundedRect(notesX, notesY, notesWidth, notesHeight, 1.5, 1.5, 'F');
                
                // Center text perfectly in notes box with proper vertical alignment
                if (notesLinesToShow === 1) {
                    // Single line - center vertically in the box
                    const lineWidth = doc.getTextWidth(notesLines[0]);
                    const textX = notesX + (notesWidth / 2) - (lineWidth / 2);
                    const textY = notesY + (notesHeight / 2) + (notesFontSize * 0.25);
                    doc.text(notesLines[0], textX, textY);
                } else {
                    // Multiple lines - center the text block vertically
                    const lineHeight = notesFontSize * 1.25;
                    const totalTextHeight = notesLinesToShow * lineHeight;
                    const textStartY = notesY + (notesHeight / 2) - (totalTextHeight / 2) + (notesFontSize * 0.75);
                    
                    for (let i = 0; i < notesLinesToShow; i++) {
                        const line = notesLines[i];
                        const lineWidth = doc.getTextWidth(line);
                        // Center horizontally within the notes box
                        const textX = notesX + (notesWidth / 2) - (lineWidth / 2);
                        doc.text(line, textX, textStartY + (i * lineHeight));
                    }
                }
            }
            
            // Reset for next row
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(fontSize);
            yPosition += maxRowHeight;
        });
        
        // Add footer
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        const footerY = Math.min(285, yPosition + 5); // Adjust footer position if needed
        doc.text('Generated by Church Program Smart Assistant', 20, footerY);
        doc.text(`Total Items: ${programData.length}`, 170, footerY);
        
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
                mic: item.mic
            },
            notes: item.notes || '',
            autoFilled: item.notes !== 'Unmatched - requires manual input'
        })),
        summary: {
            totalItems: programData.length,
            autoFilledItems: programData.filter(item => item.notes !== 'Unmatched - requires manual input').length,
            manualItems: programData.filter(item => item.notes === 'Unmatched - requires manual input').length
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
        item.notes && item.notes !== 'Unmatched - requires manual input'
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
