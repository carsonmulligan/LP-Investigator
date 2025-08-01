// popup.js for LP Investigator Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-recording');
    const clearBtn = document.getElementById('clear-list');
    const copyBtn = document.getElementById('copy-list');
    const copyAllContextBtn = document.getElementById('copy-all-context');
    const saveTextBtn = document.getElementById('save-text');
    const uploadImageBtn = document.getElementById('upload-image');
    const imageInput = document.getElementById('image-input');
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
            copyAllContextBtn.style.display = 'inline-block';
            clearBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
            copyAllContextBtn.style.display = 'none';
            clearBtn.style.display = 'none';
        }

        toggleBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        toggleBtn.disabled = !canStartRecording() && !isRecording;
        folderSelect.disabled = isRecording;
        newFolderInput.disabled = isRecording;
        createFolderBtn.disabled = isRecording || !newFolderInput.value.trim();
        saveTextBtn.disabled = !getChosenFolder();
        uploadImageBtn.disabled = !getChosenFolder();
        statusDiv.textContent = isRecording
            ? `Recording in folder: ${currentFolder || ''}`
            : '';
            
        // Load saved content
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

            // Load saved images
            chrome.runtime.sendMessage({
                type: 'GET_SAVED_IMAGES',
                folderName: selectedFolder
            }, (response) => {
                if (response && response.success && response.images && response.images.length > 0) {
                    displaySavedImages(response.images);
                } else {
                    document.getElementById('saved-images').style.display = 'none';
                }
            });
        } else {
            document.getElementById('saved-content').style.display = 'none';
            document.getElementById('saved-images').style.display = 'none';
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
            // Set the dropdown to the newly created folder
            setTimeout(() => {
                folderSelect.value = folderName;
                refreshState();
            }, 100);
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

    // Copy all context (links + saved text)
    copyAllContextBtn.addEventListener('click', () => {
        const selectedFolder = isRecording ? currentFolder : getChosenFolder();
        if (!selectedFolder || !folders[selectedFolder]) return;
        
        // Get saved content for this folder
        chrome.runtime.sendMessage({
            type: 'GET_SAVED_CONTENT',
            folderName: selectedFolder
        }, (response) => {
            let contextText = `Investigation: ${selectedFolder}\n`;
            contextText += `Generated: ${new Date().toLocaleString()}\n\n`;
            
            // Add URLs
            contextText += `=== VISITED URLS ===\n`;
            const urls = folders[selectedFolder] || [];
            urls.forEach((url, index) => {
                contextText += `${index + 1}. ${url}\n`;
            });
            
            // Add saved page content
            if (response && response.success && response.content && response.content.length > 0) {
                contextText += `\n=== SAVED PAGE CONTENT ===\n\n`;
                response.content.forEach((item, index) => {
                    contextText += `--- Page ${index + 1} ---\n`;
                    contextText += `Title: ${item.title}\n`;
                    contextText += `URL: ${item.url}\n`;
                    contextText += `Saved: ${new Date(item.savedAt).toLocaleString()}\n`;
                    contextText += `Content:\n${item.text}\n\n`;
                });
            }
            
            // Copy to clipboard
            navigator.clipboard.writeText(contextText).then(() => {
                statusDiv.textContent = 'All context copied to clipboard!';
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 2000);
            });
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

    // Upload image button handler
    uploadImageBtn.addEventListener('click', () => {
        const selectedFolder = getChosenFolder();
        if (!selectedFolder) {
            statusDiv.textContent = 'Please select a folder first';
            return;
        }
        imageInput.click();
    });

    // Handle file selection
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const selectedFolder = getChosenFolder();
        if (!selectedFolder) {
            statusDiv.textContent = 'Please select a folder first';
            return;
        }

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            statusDiv.textContent = 'Please select an image file';
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            statusDiv.textContent = 'Image file too large (max 5MB)';
            return;
        }

        statusDiv.textContent = 'Uploading image...';

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            chrome.runtime.sendMessage({
                type: 'SAVE_IMAGE',
                folderName: selectedFolder,
                imageData: imageData,
                fileName: file.name,
                fileType: file.type
            }, (response) => {
                if (response && response.success) {
                    statusDiv.textContent = 'Image uploaded successfully!';
                    imageInput.value = ''; // Clear the input
                    refreshState();
                } else {
                    statusDiv.textContent = 'Failed to upload: ' + (response ? response.error : 'Unknown error');
                }
            });
        };
        reader.readAsDataURL(file);
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
                <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; position: relative;">
                    <button class="delete-btn" data-id="${item.id}" title="Delete this saved content" style="position: absolute; top: 5px; right: 5px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">×</button>
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
        
        // Add event listeners for delete buttons
        contentList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const contentId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this saved content?')) {
                    deleteSavedContent(contentId);
                }
            });
        });
        
        savedContentDiv.style.display = 'block';
    }

    // Function to delete saved content
    function deleteSavedContent(contentId) {
        chrome.runtime.sendMessage({
            type: 'DELETE_SAVED_CONTENT',
            contentId: contentId
        }, (response) => {
            if (response && response.success) {
                statusDiv.textContent = 'Content deleted!';
                refreshState();
            } else {
                statusDiv.textContent = 'Failed to delete: ' + (response ? response.error : 'Unknown error');
            }
        });
    }

    // Function to display saved images
    function displaySavedImages(imagesArray) {
        const imageList = document.getElementById('image-list');
        const savedImagesDiv = document.getElementById('saved-images');
        
        imageList.innerHTML = '';
        
        imagesArray.forEach(item => {
            const div = document.createElement('div');
            div.className = 'saved-image-item';
            div.innerHTML = `
                <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; position: relative;">
                    <button class="delete-btn" data-id="${item.id}" title="Delete this image" style="position: absolute; top: 5px; right: 5px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">×</button>
                    <div style="margin-right: 30px;">
                        <strong>🖼️ ${item.fileName}</strong><br>
                        <small style="color: #666;">Uploaded: ${new Date(item.uploadedAt).toLocaleString()} | Size: ${(item.size / 1024).toFixed(1)} KB</small><br>
                        <button class="view-image-btn" data-image="${item.imageData}" data-filename="${item.fileName}" style="margin-top: 5px; background: #0066cc; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px;">View Image</button>
                    </div>
                </div>
            `;
            imageList.appendChild(div);
        });
        
        // Add event listeners for delete buttons
        imageList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const imageId = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this image?')) {
                    deleteSavedImage(imageId);
                }
            });
        });

        // Add event listeners for view image buttons
        imageList.querySelectorAll('.view-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const imageData = btn.getAttribute('data-image');
                const filename = btn.getAttribute('data-filename');
                viewImage(imageData, filename);
            });
        });
        
        savedImagesDiv.style.display = 'block';
    }

    // Function to view image in new tab
    function viewImage(imageData, filename) {
        const newTab = window.open('', '_blank');
        newTab.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 20px; 
                        background: #f5f5f5; 
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }
                    img { 
                        max-width: 100%; 
                        max-height: 90vh; 
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    }
                    .header {
                        margin-bottom: 20px;
                        color: #333;
                    }
                    .download-btn {
                        display: inline-block;
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #0066cc;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-weight: bold;
                    }
                    .download-btn:hover {
                        background: #0052a3;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${filename}</h2>
                </div>
                <img src="${imageData}" alt="${filename}">
                <br>
                <a href="${imageData}" download="${filename}" class="download-btn">Download Image</a>
            </body>
            </html>
        `);
        newTab.document.close();
    }

    // Function to delete saved image
    function deleteSavedImage(imageId) {
        chrome.runtime.sendMessage({
            type: 'DELETE_SAVED_IMAGE',
            imageId: imageId
        }, (response) => {
            if (response && response.success) {
                statusDiv.textContent = 'Image deleted!';
                refreshState();
            } else {
                statusDiv.textContent = 'Failed to delete: ' + (response ? response.error : 'Unknown error');
            }
        });
    }

    refreshState();
});