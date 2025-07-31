# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LP-Investigator is a Chrome extension (Manifest V3) that records visited websites during browsing sessions and exports them as bulleted lists. The extension uses a folder-based organization system for managing multiple recording sessions.

## Architecture

The extension follows Chrome's Manifest V3 architecture with these key components:

- **background.js**: Service worker that handles tab tracking, message passing, and state management
- **popup.js/popup.html**: User interface for controlling recording, managing folders, and viewing/exporting URLs
- **manifest.json**: Chrome extension configuration defining permissions (tabs, storage) and entry points

### Message Flow
The popup communicates with the background service worker via Chrome's message passing API. Key message types:
- `GET_STATE`: Retrieve current recording state and folders
- `START_RECORDING`/`STOP_RECORDING`: Control recording sessions
- `CREATE_FOLDER`/`CLEAR_FOLDER`: Manage folder organization

### State Management
- Recording state and URL collections are managed in the background service worker
- Data persistence uses Chrome's storage API
- Folder-based organization allows multiple recording sessions

## Development Commands

This is a pure Chrome extension with no build process:

```bash
# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select the LP-Investigator folder

# Reload extension after changes
# Click the refresh icon on the extension card in chrome://extensions/
```

## Key Implementation Notes

- The extension tracks only HTTP/HTTPS URLs, filtering out chrome:// and other protocols
- Consecutive duplicate URLs are automatically filtered during recording
- The popup UI updates are handled through a central `updateUI()` function that manages all UI state
- Recording can only start when a folder is selected or created