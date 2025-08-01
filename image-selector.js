// image-selector.js for image area selection
let isSelecting = false;
let startX, startY, endX, endY;
let selectionOverlay = null;
let imageContainer = null;
let capturedImage = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get elements
    selectionOverlay = document.getElementById('selection-overlay');
    imageContainer = document.getElementById('image-container');
    capturedImage = document.getElementById('captured-image');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const statusDiv = document.getElementById('status');

    // Load the captured image
    try {
        const result = await chrome.storage.local.get(['tempCapturedImage']);
        if (result.tempCapturedImage) {
            capturedImage.src = result.tempCapturedImage.dataUrl;
            
            // Wait for image to load
            capturedImage.onload = () => {
                // Set container size to match image
                imageContainer.style.width = capturedImage.naturalWidth + 'px';
                imageContainer.style.height = capturedImage.naturalHeight + 'px';
            };
        } else {
            showStatus('No captured image found', 'error');
        }
    } catch (error) {
        showStatus('Failed to load captured image: ' + error.message, 'error');
    }

    // Event listeners
    imageContainer.addEventListener('mousedown', startSelection);
    imageContainer.addEventListener('mousemove', updateSelection);
    imageContainer.addEventListener('mouseup', endSelection);
    document.addEventListener('keydown', handleKeyDown);
    
    saveBtn.addEventListener('click', saveSelectedArea);
    cancelBtn.addEventListener('click', cancelSelection);
});

function startSelection(e) {
    const rect = imageContainer.getBoundingClientRect();
    isSelecting = true;
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    selectionOverlay.style.display = 'block';
    selectionOverlay.style.left = startX + 'px';
    selectionOverlay.style.top = startY + 'px';
    selectionOverlay.style.width = '0px';
    selectionOverlay.style.height = '0px';
    
    document.getElementById('save-btn').disabled = true;
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    const rect = imageContainer.getBoundingClientRect();
    endX = e.clientX - rect.left;
    endY = e.clientY - rect.top;
    
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    selectionOverlay.style.left = left + 'px';
    selectionOverlay.style.top = top + 'px';
    selectionOverlay.style.width = width + 'px';
    selectionOverlay.style.height = height + 'px';
}

function endSelection(e) {
    if (!isSelecting) return;
    
    isSelecting = false;
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Only enable save if selection is meaningful
    if (width > 10 && height > 10) {
        document.getElementById('save-btn').disabled = false;
    }
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        cancelSelection();
    }
}

async function saveSelectedArea() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    
    try {
        // Get the selection area
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        
        // Create canvas to crop the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the cropped portion
        ctx.drawImage(capturedImage, left, top, width, height, 0, 0, width, height);
        
        // Convert to data URL
        const croppedDataUrl = canvas.toDataURL('image/png');
        
        // Get the original data
        const result = await chrome.storage.local.get(['tempCapturedImage']);
        const tempData = result.tempCapturedImage;
        
        // Send to background script to save
        chrome.runtime.sendMessage({
            type: 'SAVE_CROPPED_IMAGE',
            folderName: tempData.folderName,
            originalTab: tempData.originalTab,
            croppedDataUrl: croppedDataUrl,
            area: { left, top, width, height }
        }, (response) => {
            if (response && response.success) {
                showStatus('Image saved successfully!', 'success');
                // Clean up temp data
                chrome.storage.local.remove(['tempCapturedImage']);
                // Close the tab after a short delay
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                showStatus('Failed to save image: ' + (response ? response.error : 'Unknown error'), 'error');
                saveBtn.disabled = false;
            }
        });
        
    } catch (error) {
        showStatus('Failed to process image: ' + error.message, 'error');
        saveBtn.disabled = false;
    }
}

function cancelSelection() {
    // Clean up temp data
    chrome.storage.local.remove(['tempCapturedImage']);
    // Close the tab
    window.close();
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
} 