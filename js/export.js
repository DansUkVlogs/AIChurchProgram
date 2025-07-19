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
        
        // Add title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Church Program Schedule', 20, 20);
        
        // Add date and 3rd Sunday info
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const date = formatDate();
        doc.text(`Generated: ${date}`, 20, 30);
        doc.text(`3rd Sunday: ${isThirdSunday ? 'Yes' : 'No'}`, 20, 40);
        
        // Add table headers
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Program Item', 20, 55);
        doc.text('Camera', 130, 55);
        doc.text('Scene', 155, 55);
        doc.text('Mic', 175, 55);
        
        // Add horizontal line
        doc.line(20, 58, 190, 58);
        
        // Add data rows
        doc.setFont(undefined, 'normal');
        let yPosition = 65;
        
        programData.forEach((item, index) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
                
                // Re-add headers on new page
                doc.setFont(undefined, 'bold');
                doc.text('Program Item', 20, yPosition);
                doc.text('Camera', 130, yPosition);
                doc.text('Scene', 155, yPosition);
                doc.text('Mic', 175, yPosition);
                doc.line(20, yPosition + 3, 190, yPosition + 3);
                yPosition += 10;
                doc.setFont(undefined, 'normal');
            }
            
            // Wrap long program items
            const lines = doc.splitTextToSize(item.programItem, 105);
            const lineHeight = 5;
            
            lines.forEach((line, lineIndex) => {
                doc.text(line, 20, yPosition + (lineIndex * lineHeight));
            });
            
            // Add other columns
            doc.text(item.camera, 130, yPosition);
            doc.text(item.scene, 155, yPosition);
            doc.text(item.mic, 175, yPosition);
            
            yPosition += Math.max(lines.length * lineHeight, 7);
        });
        
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
