// Hash utility functions for consistent problem selection

window.HashUtils = class {
  /**
   * Generate hash code from string
   * @param {string} str - String to hash
   * @returns {number} Hash code
   */
  static hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Select item from array using date-based seed
   * @param {Array} items - Array to select from
   * @param {string} dateKey - Date key for consistency
   * @param {string} type - Type identifier for uniqueness
   * @param {string} seed - Additional seed string
   * @returns {*} Selected item or null if array is empty
   */
  static selectDailyItem(items, dateKey, type, seed = 'cf-daily-2024') {
    if (!items || items.length === 0) return null;
    
    const hashInput = `${dateKey}${type}${seed}`;
    const hash = this.hashCode(hashInput);
    const index = Math.abs(hash) % items.length;
    
    return items[index];
  }

  /**
   * Generate consistent seed for date and user
   * @param {string} dateKey - Date key
   * @param {string} username - Username (optional)
   * @param {string} type - Problem type
   * @returns {string} Generated seed
   */
  static generateSeed(dateKey, username = '', type = '') {
    return `${dateKey}-${username}-${type}-cf-daily-2024`;
  }