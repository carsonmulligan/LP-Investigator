// popup.js for LP Investigator Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-recording');
    const clearBtn = document.getElementById('clear-list');
    const copyBtn = document.getElementById('copy-list');
    const saveTextBtn = document.getElementById('save-text');
    const folderSelect = document.getElementById('folder-select');
    const newFolderInput = document.getElementById('new-folder');
    const createFolderBtn = document.getElementById('create-folder');
    const urlList = document.getElementById('url-list');
    const statusDiv = document.getElementById('status');

    let folders = {};
    let isRecording = false;
    let currentFolder = null;

    function getChosenFolder() {
        return folderSelect.value;
    }

    function canStartRecording() {
        return !!getChosenFolder();
    }

    function updateUI(state) {
        folders = state.folders || {};
        isRecording = state.isRecording;
        currentFolder = state.currentFolder || null;

        // Populate folder dropdown
        const prevValue = folderSelect.value;
        folderSelect.innerHTML = '<option value="">Select...</option>';
        Object.keys(folders).forEach(folder => {
            const option = document.createElement('option');
            option.value = folder;
            option.textContent = folder;
            folderSelect.appendChild(option);
        });
        if (prevValue && folders[prevValue]) {
            folderSelect.value = prevValue;
        } else if (folderSelect.options.length > 1) {
            folderSelect.selectedIndex = 1;
        }

        // Show links for selected folder
        let selectedFolder = isRecording ? currentFolder : getChosenFolder();
        urlList.innerHTML = '';
        if (selectedFolder && folders[selectedFolder]) {
            folders[selectedFolder].forEach(url => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url;
                a.textContent = url;
                a.target = '_blank';
                li.appendChild(a);
                urlList.appendChild(li);
            });
            copyBtn.style.display = 'inline-block';
            clearBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
            clearBtn.style.display = 'none';
        }

        toggleBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        toggleBtn.disabled = !canStartRecording() && !isRecording;
        folderSelect.disabled = isRecording;
        newFolderInput.disabled = isRecording;
        createFolderBtn.disabled = isRecording || !newFolderInput.value.trim();
        saveTextBtn.disabled = !getChosenFolder();
        statusDiv.textContent = isRecording
            ? `Recording in folder: ${currentFolder || ''}`
            : '';
            
        // Load saved content
        const selectedFolder = isRecording ? currentFolder : getChosenFolder();
        if (selectedFolder) {
            chrome.runtime.sendMessage({
                type: 'GET_SAVED_CONTENT',
                folderName: selectedFolder
            }, (response) => {
                if (response && response.success && response.content && response.content.length > 0) {
                    displaySavedContent(response.content);
                } else {
                    document.getElementById('saved-content').style.display = 'none';
                }
            });
        } else {
            document.getElementById('saved-content').style.display = 'none';
        }
    }

    function refreshState() {
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
            updateUI(response);
        });
    }

    // Create Folder logic
    createFolderBtn.addEventListener('click', () => {
        const folderName = newFolderInput.value.trim();
        if (!folderName) return;
        chrome.runtime.sendMessage({ type: 'CREATE_FOLDER', folderName }, () => {
            newFolderInput.value = '';
            setTimeout(refreshState, 100);
        });
    });

    newFolderInput.addEventListener('input', () => {
        // Just update the create folder button state based on input
        createFolderBtn.disabled = isRecording || !newFolderInput.value.trim();
    });

    // Toggle recording
    toggleBtn.addEventListener('click', () => {
        if (!isRecording) {
            const folderName = getChosenFolder();
            if (!folderName) return;
            chrome.runtime.sendMessage({ type: 'START_RECORDING', folderName }, () => {
                setTimeout(refreshState, 100);
            });
        } else {
            chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, () => {
                setTimeout(refreshState, 100);
            });
        }
    });

    // Folder selection logic
    folderSelect.addEventListener('change', () => {
        updateUI({ folders, currentFolder, isRecording });
    });

    // Copy list to clipboard
    copyBtn.addEventListener('click', () => {
        const selectedFolder = isRecording ? currentFolder : getChosenFolder();
        if (!selectedFolder || !folders[selectedFolder]) return;
        const items = folders[selectedFolder].map(url => `• ${url}`);
        const text = items.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            statusDiv.textContent = 'Copied to clipboard!';
            setTimeout(refreshState, 2000);
        });
    });

    // Clear folder
    clearBtn.addEventListener('click', () => {
        const selectedFolder = isRecording ? currentFolder : getChosenFolder();
        if (!selectedFolder) return;
        if (!confirm(`Delete folder "${selectedFolder}" and all its links?`)) return;
        chrome.runtime.sendMessage({ type: 'CLEAR_FOLDER', folderName: selectedFolder }, () => {
            refreshState();
        });
    });
    
    // Save page text button handler
    saveTextBtn.addEventListener('click', async () => {
        const selectedFolder = getChosenFolder();
        if (!selectedFolder) {
            statusDiv.textContent = 'Please select a folder first';
            return;
        }
        
        statusDiv.textContent = 'Saving page text...';
        
        chrome.runtime.sendMessage({
            type: 'SAVE_PAGE_TEXT',
            folderName: selectedFolder
        }, (response) => {
            if (response && response.success) {
                statusDiv.textContent = 'Page text saved!';
                refreshState();
            } else {
                statusDiv.textContent = 'Failed to save: ' + (response ? response.error : 'Unknown error');
            }
        });
    });
    
    // Function to display saved content
    function displaySavedContent(contentArray) {
        const contentList = document.getElementById('content-list');
        const savedContentDiv = document.getElementById('saved-content');
        
        contentList.innerHTML = '';
        
        contentArray.forEach(item => {
            const div = document.createElement('div');
            div.className = 'saved-item';
            div.innerHTML = `
                <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <strong>📄 ${item.title}</strong><br>
                    <small>${item.url}</small><br>
                    <small>Saved: ${new Date(item.savedAt).toLocaleString()}</small><br>
                    <details style="margin-top: 5px;">
                        <summary>Preview (${item.text.length} chars)</summary>
                        <pre style="white-space: pre-wrap; max-height: 200px; overflow-y: auto; font-size: 12px; background: #f5f5f5; padding: 5px; margin-top: 5px;">
${item.text.substring(0, 500)}${item.text.length > 500 ? '...' : ''}
                        </pre>
                    </details>
                </div>
            `;
            contentList.appendChild(div);
        });
        
        savedContentDiv.style.display = 'block';
    }

    refreshState();
});