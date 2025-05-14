// popup.js for LP-Investigator Chrome Extension 

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-recording');
    const clearBtn = document.getElementById('clear-list');
    const copyBtn = document.getElementById('copy-list');
    const urlList = document.getElementById('url-list');
    const statusDiv = document.getElementById('status');

    // Helper to update UI
    function updateUI(isRecording, visitedUrls) {
        toggleBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
        statusDiv.textContent = isRecording ? 'Recording...' : (visitedUrls.length ? 'Session complete.' : '');
        urlList.innerHTML = '';
        if (!isRecording && visitedUrls.length) {
            visitedUrls.forEach(url => {
                const li = document.createElement('li');
                li.textContent = url;
                urlList.appendChild(li);
            });
            copyBtn.style.display = 'inline-block';
            clearBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
            clearBtn.style.display = 'none';
        }
    }

    // Get current state from background
    function refreshState() {
        chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
            updateUI(response.isRecording, response.visitedUrls || []);
        });
    }

    // Toggle recording
    toggleBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_RECORDING' }, (response) => {
            refreshState();
        });
    });

    // Copy list to clipboard
    copyBtn.addEventListener('click', () => {
        const items = Array.from(urlList.querySelectorAll('li')).map(li => `• ${li.textContent}`);
        const text = items.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            statusDiv.textContent = 'Copied to clipboard!';
            setTimeout(refreshState, 1000);
        });
    });

    // Clear list
    clearBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_LIST' }, () => {
            refreshState();
        });
    });

    refreshState();
}); 