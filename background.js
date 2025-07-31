// background.js for LP-Investigator Chrome Extension 
importScripts('db.js');

let isRecording = false;
let folders = {};
let currentFolder = null;

// Initialize database
let db = new SimpleDB();
db.init().catch(console.error);

// Initialize from storage
chrome.storage.local.get(['folders'], (result) => {
    if (result.folders) {
        folders = result.folders;
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_STATE') {
        sendResponse({ isRecording, folders, currentFolder });
    } else if (message.type === 'CREATE_FOLDER') {
        folders[message.folderName] = [];
        chrome.storage.local.set({ folders });
        sendResponse({ success: true });
    } else if (message.type === 'START_RECORDING') {
        isRecording = true;
        currentFolder = message.folderName;
        if (!folders[currentFolder]) {
            folders[currentFolder] = [];
        }
        sendResponse({ success: true });
    } else if (message.type === 'STOP_RECORDING') {
        isRecording = false;
        currentFolder = null;
        chrome.storage.local.set({ folders });
        sendResponse({ success: true });
    } else if (message.type === 'CLEAR_FOLDER') {
        delete folders[message.folderName];
        chrome.storage.local.set({ folders });
        sendResponse({ success: true });
    }
    return true;
});

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isRecording && currentFolder && changeInfo.status === 'complete' && tab.url && isHttpUrl(tab.url)) {
        // Avoid consecutive duplicates
        const folderUrls = folders[currentFolder] || [];
        if (folderUrls.length === 0 || folderUrls[folderUrls.length - 1] !== tab.url) {
            folders[currentFolder].push(tab.url);
            chrome.storage.local.set({ folders });
        }
    }
});

// Helper to check if URL is http/https
function isHttpUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
} 