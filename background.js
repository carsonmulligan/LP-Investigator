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
        // Get latest folders from storage first
        chrome.storage.local.get(['folders'], (result) => {
            folders = result.folders || {};
            isRecording = true;
            currentFolder = message.folderName;
            if (!folders[currentFolder]) {
                folders[currentFolder] = [];
            }
            // Save the updated state immediately
            chrome.storage.local.set({ folders }, () => {
                sendResponse({ success: true });
            });
        });
        return true; // Keep message channel open
    } else if (message.type === 'STOP_RECORDING') {
        isRecording = false;
        currentFolder = null;
        chrome.storage.local.set({ folders });
        sendResponse({ success: true });
    } else if (message.type === 'CLEAR_FOLDER') {
        delete folders[message.folderName];
        chrome.storage.local.set({ folders });
        sendResponse({ success: true });
    } else if (message.type === 'SAVE_PAGE_TEXT') {
        // Handler for saving page text
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            if (!tabs[0]) {
                sendResponse({ success: false, error: 'No active tab' });
                return;
            }
            
            const tab = tabs[0];
            
            try {
                // Inject content extractor and get text
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: extractPageText
                });
                
                const pageText = results[0].result;
                
                // Save to IndexedDB
                const content = {
                    id: `page_${Date.now()}`,
                    folderName: message.folderName,
                    url: tab.url,
                    title: tab.title,
                    text: pageText,
                    savedAt: new Date().toISOString()
                };
                
                await db.savePageContent(content);
                sendResponse({ success: true, content });
                
            } catch (error) {
                console.error('Failed to save page text:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
        
        return true; // Keep message channel open
    } else if (message.type === 'GET_SAVED_CONTENT') {
        // Handler for getting saved content
        db.getContentByFolder(message.folderName).then(content => {
            sendResponse({ success: true, content });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    return true;
});

// Listen for tab updates (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isRecording && currentFolder && changeInfo.status === 'complete' && tab.url && isHttpUrl(tab.url)) {
        // Get latest folders data from storage to ensure we don't lose URLs
        chrome.storage.local.get(['folders'], (result) => {
            folders = result.folders || {};
            
            // Ensure the folder exists
            if (!folders[currentFolder]) {
                folders[currentFolder] = [];
            }
            
            // Avoid consecutive duplicates
            const folderUrls = folders[currentFolder];
            if (folderUrls.length === 0 || folderUrls[folderUrls.length - 1] !== tab.url) {
                folders[currentFolder].push(tab.url);
                chrome.storage.local.set({ folders });
            }
        });
    }
});

// Helper to check if URL is http/https
function isHttpUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}

// Text extraction function
function extractPageText() {
    const bodyClone = document.body.cloneNode(true);
    const unwanted = bodyClone.querySelectorAll('script, style, noscript, iframe, object, embed, nav, header, footer, aside');
    unwanted.forEach(el => el.remove());
    
    let contentElement = bodyClone.querySelector('main') || 
                        bodyClone.querySelector('article') ||
                        bodyClone.querySelector('[role="main"]') ||
                        bodyClone.querySelector('.content') ||
                        bodyClone.querySelector('#content') ||
                        bodyClone;
    
    let text = contentElement.innerText || contentElement.textContent || '';
    text = text.replace(/\n{3,}/g, '\n\n').replace(/\s{2,}/g, ' ').trim();
    
    return text;
} 