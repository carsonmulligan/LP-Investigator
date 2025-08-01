class SimpleDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LPInvestigatorDB', 2); // Increment to version 2
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create pageContent store if it doesn't exist
        if (!db.objectStoreNames.contains('pageContent')) {
          const store = db.createObjectStore('pageContent', { keyPath: 'id' });
          store.createIndex('folderName', 'folderName', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
        
        // Create images store if it doesn't exist
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', { keyPath: 'id' });
          store.createIndex('folderName', 'folderName', { unique: false });
          store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
    });
  }

  async savePageContent(content) {
    const transaction = this.db.transaction(['pageContent'], 'readwrite');
    const store = transaction.objectStore('pageContent');
    return store.add(content);
  }

  async getContentByFolder(folderName) {
    const transaction = this.db.transaction(['pageContent'], 'readonly');
    const store = transaction.objectStore('pageContent');
    const index = store.index('folderName');
    
    return new Promise((resolve) => {
      const request = index.getAll(folderName);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteContent(id) {
    const transaction = this.db.transaction(['pageContent'], 'readwrite');
    const store = transaction.objectStore('pageContent');
    return store.delete(id);
  }

  async saveImage(imageData) {
    const transaction = this.db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    return store.add(imageData);
  }

  async getImagesByFolder(folderName) {
    const transaction = this.db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const index = store.index('folderName');
    
    return new Promise((resolve) => {
      const request = index.getAll(folderName);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteImage(id) {
    const transaction = this.db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    return store.delete(id);
  }
}