// API service for Codeforces API interactions

window.ApiService = class {
  constructor() {
    this.baseUrl = window.CONFIG.API.BASE_URL;
    this.timeout = window.CONFIG.API.TIMEOUT;
    this.retryAttempts = window.CONFIG.API.RETRY_ATTEMPTS;
  }

  /**
   * Make API request with retry logic
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = {
      timeout: this.timeout,
      ...options
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        window.logger.debug('ApiService.makeRequest', `Attempt ${attempt} for ${endpoint}`);
        
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.status !== 'OK') {
          throw new Error(`API Error: ${data.comment || 'Unknown error'}`);
        }

        window.logger.debug('ApiService.makeRequest', `Success for ${endpoint}`, data);
        return data;

      } catch (error) {
        window.logger.warn('ApiService.makeRequest', `Attempt ${attempt} failed for ${endpoint}`, error);
        
        if (attempt === this.retryAttempts) {
          window.logger.error('ApiService.makeRequest', `All attempts failed for ${endpoint}`, error);
          throw new Error(window.ERROR_MESSAGES.API_ERROR);
        }
        
        // Wait before retry (exponential backoff)
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Fetch all problems from Codeforces
   * @returns {Promise<Array>} Array of problems
   */
  async fetchProblems() {
    try {
      window.logger.info('ApiService.fetchProblems', 'Fetching problems from API');
      const data = await this.makeRequest(window.CONFIG.API.ENDPOINTS.PROBLEMS);
      return data.result.problems;
    } catch (error) {
      window.logger.error('ApiService.fetchProblems', 'Failed to fetch problems', error);
      throw error;
    }
  }

  /**
   * Fetch user information
   * @param {string} username - Codeforces username
   * @returns {Promise<Object>} User information
   */
  async fetchUserInfo(username) {
    try {
      window.logger.info('ApiService.fetchUserInfo', `Fetching info for user: ${username}`);
      const data = await this.makeRequest(`${window.CONFIG.API.ENDPOINTS.USER_INFO}?handles=${username}`);
      
      if (!data.result || data.result.length === 0) {
        throw new Error(window.ERROR_MESSAGES.USER_NOT_FOUND);
      }
      
      return data.result[0];
    } catch (error) {
      window.logger.error('ApiService.fetchUserInfo', `Failed to fetch user info for ${username}`, error);
      throw error;
    }
  }

  /**
   * Fetch user submissions
   * @param {string} username - Codeforces username
   * @param {number} count - Number of submissions to fetch
   * @returns {Promise<Array>} Array of submissions
   */
  async fetchUserSubmissions(username, count = CONFIG.CACHE.MAX_SUBMISSIONS_CHECK || 100) {
  async fetchUserSubmissions(username, count = window.CONFIG.CACHE.MAX_SUBMISSIONS_CHECK || 100) {
    try {
      window.logger.info('ApiService.fetchUserSubmissions', `Fetching submissions for user: ${username}`);
      const data = await this.makeRequest(
        `${window.CONFIG.API.ENDPOINTS.USER_STATUS}?handle=${username}&from=1&count=${count}`
      );
      return data.result;
    } catch (error) {
      window.logger.error('ApiService.fetchUserSubmissions', `Failed to fetch submissions for ${username}`, error);
      throw error;
    }
  }

  /**
   * Delay function for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Create singleton instance
window.apiService = new window.ApiService();