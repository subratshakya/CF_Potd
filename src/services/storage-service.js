// Storage service for Chrome extension storage operations

window.StorageService = class {
  /**
   * Get data from Chrome storage
   * @param {string} key - Storage key
   * @returns {Promise<*>} Stored data
   */
  static async get(key) {
    try {
      window.logger.trace('StorageService.get', `Getting key: ${key}`);
      
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          const data = result[key];
          logger.trace('StorageService.get', `Retrieved data for ${key}`, data);
          resolve(data);
        });
      });
    } catch (error) {
      window.logger.error('StorageService.get', `Error getting key ${key}`, error);
      return null;
    }
  }

  /**
   * Set data in Chrome storage
   * @param {string} key - Storage key
   * @param {*} value - Data to store
   * @returns {Promise<boolean>} Success status
   */
  static async set(key, value) {
    try {
      window.logger.trace('StorageService.set', `Setting key: ${key}`, value);
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          logger.trace('StorageService.set', `Successfully set ${key}`);
          resolve(true);
        });
      });
    } catch (error) {
      window.logger.error('StorageService.set', `Error setting key ${key}`, error);
      return false;
    }
  }

  /**
   * Get all storage keys
   * @returns {Promise<Array>} Array of all keys
   */
  static async getAllKeys() {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          const keys = Object.keys(items);
          window.logger.trace('StorageService.getAllKeys', `Found ${keys.length} keys`);
          resolve(keys);
        });
      });
    } catch (error) {
      window.logger.error('StorageService.getAllKeys', 'Error getting all keys', error);
      return [];
    }
  }

  /**
   * Remove data from storage
   * @param {string|Array} keys - Key(s) to remove
   * @returns {Promise<boolean>} Success status
   */
  static async remove(keys) {
    try {
      window.logger.trace('StorageService.remove', `Removing keys:`, keys);
      
      return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => {
          logger.trace('StorageService.remove', `Successfully removed keys`);
          resolve(true);
        });
      });
    } catch (error) {
      window.logger.error('StorageService.remove', 'Error removing keys', error);
      return false;
    }
  }

  /**
   * Clear user-specific cache
   * @returns {Promise<boolean>} Success status
   */
  static async clearUserCache() {
    try {
      window.logger.info('StorageService.clearUserCache', 'Clearing user cache');
      
      const keys = await this.getAllKeys();
      const keysToRemove = keys.filter(key =>
        key.startsWith(window.CONFIG.CACHE.KEYS.STREAK_PREFIX) ||
        key.startsWith(window.CONFIG.CACHE.KEYS.RATING_PREFIX) ||
        key.startsWith(window.CONFIG.CACHE.KEYS.USER_PREFIX)
      );
      
      if (keysToRemove.length > 0) {
        await this.remove(keysToRemove);
        window.logger.info('StorageService.clearUserCache', `Cleared ${keysToRemove.length} cache entries`);
      }
      
      return true;
    } catch (error) {
      window.logger.error('StorageService.clearUserCache', 'Error clearing user cache', error);
      return false;
    }
  }

  /**
   * Clear old cache entries
   * @param {number} maxAgeHours - Maximum age in hours
   * @returns {Promise<boolean>} Success status
   */
  static async clearOldCache(maxAgeHours = CONFIG.CACHE.DURATION_HOURS) {
  static async clearOldCache(maxAgeHours = window.CONFIG.CACHE.DURATION_HOURS) {
    try {
      window.logger.info('StorageService.clearOldCache', `Clearing cache older than ${maxAgeHours} hours`);
      
      const keys = await this.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.startsWith(window.CONFIG.CACHE.KEYS.GLOBAL_PREFIX) ||
        key.startsWith(window.CONFIG.CACHE.KEYS.USER_PREFIX)
      );
      
      const keysToRemove = [];
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      for (const key of cacheKeys) {
        const data = await this.get(key);
        if (data && data.cachedAt && data.cachedAt < cutoffTime) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await this.remove(keysToRemove);
        window.logger.info('StorageService.clearOldCache', `Removed ${keysToRemove.length} old cache entries`);
      }
      
      return true;
    } catch (error) {
      window.logger.error('StorageService.clearOldCache', 'Error clearing old cache', error);
      return false;
    }
  }