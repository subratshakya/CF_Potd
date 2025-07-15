// Storage utility functions for Codeforces Daily Problems Extension

class StorageManager {
  static async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  static async setStorageData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  static async getAllStorageKeys() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(Object.keys(items));
      });
    });
  }

  static async removeStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }

  static async clearUserCache() {
    try {
      const keys = await this.getAllStorageKeys();
      const keysToRemove = keys.filter(key => 
        key.startsWith('cf-streak-') || 
        key.startsWith('cf-user-rating-') ||
        key.startsWith('cf-rating-cache-') ||
        key.startsWith('cf-user-cache-')
      );
      
      if (keysToRemove.length > 0) {
        await this.removeStorageData(keysToRemove);
        console.log('Cleared user cache for keys:', keysToRemove);
      }
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }
}

// Export for use in other files
window.StorageManager = StorageManager;