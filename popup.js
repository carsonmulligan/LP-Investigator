// popup.js for LP Investigator Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-recording');
    const clearBtn = document.getElementById('clear-list');
    const copyBtn = document.getElementById('copy-list');
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
        statusDiv.textContent = isRecording
            ? `Recording in folder: ${currentFolder || ''}`
            : '';
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
        updateUI({ folders, currentFolder, isRecording });
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

    refreshState();
});