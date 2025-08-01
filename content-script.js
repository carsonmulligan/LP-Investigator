// content-script.js for snipping tool overlay
let isSelecting = false;
let startX, startY, endX, endY;
let selectionBox = null;
let overlay = null;

function createSnippingOverlay() {
    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'lp-snipping-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.3);
        z-index: 999999;
        cursor: crosshair;
        user-select: none;
    `;

    // Create instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 1000000;
    `;
    instructions.textContent = 'Drag to select area • Press ESC to cancel';
    overlay.appendChild(instructions);

    // Create selection box
    selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
        position: absolute;
        border: 2px dashed #00ff00;
        background: rgba(0, 255, 0, 0.1);
        display: none;
        pointer-events: none;
    `;
    overlay.appendChild(selectionBox);

    document.body.appendChild(overlay);

    // Event listeners
    overlay.addEventListener('mousedown', startSelection);
    overlay.addEventListener('mousemove', updateSelection);
    overlay.addEventListener('mouseup', endSelection);
    document.addEventListener('keydown', handleKeyDown);
}

function startSelection(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.display = 'block';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    endX = e.clientX;
    endY = e.clientY;
    
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
}

function endSelection(e) {
    if (!isSelecting) return;
    
    isSelecting = false;
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Only capture if selection is meaningful
    if (width > 10 && height > 10) {
        captureArea(left, top, width, height);
    }
    
    cleanup();
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        cleanup();
    }
}

function captureArea(left, top, width, height) {
    chrome.runtime.sendMessage({
        type: 'CAPTURE_AREA',
        area: { left, top, width, height }
    });
}

function cleanup() {
    if (overlay) {
        overlay.remove();
        overlay = null;
    }
    if (selectionBox) {
        selectionBox = null;
    }
    document.removeEventListener('keydown', handleKeyDown);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_SNIPPING') {
        createSnippingOverlay();
        sendResponse({ success: true });
    }
}); 