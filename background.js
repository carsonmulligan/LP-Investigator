// background.js for LP-Investigator Chrome Extension 

let isRecording = false;
let visitedUrls = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_RECORDING') {
        isRecording = !isRecording;
        if (!isRecording) {
            // Save the list when stopping
            chrome.storage.local.set({ visitedUrls });
        } else {
            // Reset the list when starting
            visitedUrls = [];
            chrome.storage.local.set({ visitedUrls });
        }
        sendResponse({ isRecording });
    } else if (message.type === 'GET_STATE') {
        sendResponse({ isRecording, visitedUrls });
    } else if (message.type === 'CLEAR_LIST') {
        visitedUrls = [];
        chrome.storage.local.set({ visitedUrls });
        sendResponse({ success: true });
    }
    return true;
});

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isRecording && changeInfo.status === 'complete' && tab.url && isHttpUrl(tab.url)) {
        // Avoid consecutive duplicates
        if (visitedUrls.length === 0 || visitedUrls[visitedUrls.length - 1] !== tab.url) {
            visitedUrls.push(tab.url);
            chrome.storage.local.set({ visitedUrls });
        }
    }
});

// Helper to check if URL is http/https
function isHttpUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
} 