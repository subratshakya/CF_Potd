// User detection and verification service

window.UserDetectionService = class {
  /**
   * Detect current user from page
   * @returns {Promise<string|null>} Username or null
   */
  static async detectUser() {
    window.logger.info('UserDetectionService.detectUser', 'Starting user detection');
    let detectedUsername = null;

    // Method 1: Check for logout link (most reliable)
    detectedUsername = this.detectFromLogoutArea();
    if (detectedUsername) {
      window.logger.info('UserDetectionService.detectUser', `Found via logout area: ${detectedUsername}`);
      return detectedUsername;
    }

    // Method 2: Check page scripts
    detectedUsername = this.detectFromScripts();
    if (detectedUsername) {
      window.logger.info('UserDetectionService.detectUser', `Found via scripts: ${detectedUsername}`);
      return detectedUsername;
    }

    // Method 3: Check meta tags and data attributes
    detectedUsername = this.detectFromMetaTags();
    if (detectedUsername) {
      window.logger.info('UserDetectionService.detectUser', `Found via meta tags: ${detectedUsername}`);
      return detectedUsername;
    }

    // Method 4: Check header navigation
    detectedUsername = this.detectFromNavigation();
    if (detectedUsername) {
      window.logger.info('UserDetectionService.detectUser', `Found via navigation: ${detectedUsername}`);
      return detectedUsername;
    }

    // Method 5: Check profile page URL
    detectedUsername = this.detectFromProfilePage();
    if (detectedUsername) {
      window.logger.info('UserDetectionService.detectUser', `Found via profile page: ${detectedUsername}`);
      return detectedUsername;
    }

    window.logger.info('UserDetectionService.detectUser', 'No user detected');
    return null;
  }

  /**
   * Detect user from logout area
   * @returns {string|null} Username or null
   */
  static detectFromLogoutArea() {
    const logoutLink = document.querySelector('a[href*="logout"]');
    if (!logoutLink) return null;

    const navArea = logoutLink.closest('.header, #header, nav, .navigation');
    if (!navArea) return null;

    const profileLinks = navArea.querySelectorAll('a[href*="/profile/"]');
    for (const link of profileLinks) {
      const href = link.getAttribute('href');
      const match = href.match(/\/profile\/([^\/\?\s]+)/);
      if (match && match[1]) {
        const linkText = link.textContent.trim().toLowerCase();
        if (!linkText.includes('profile') && !linkText.includes('view') && linkText.length > 0) {
          if (this.isValidUsername(match[1])) {
            return match[1];
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect user from page scripts
   * @returns {string|null} Username or null
   */
  static detectFromScripts() {
    const scripts = document.querySelectorAll('script');
    const patterns = [
      /window\.handle\s*=\s*['"]([^'"]+)['"]/,
      /"handle"\s*:\s*"([^"]+)"/,
      /handle['"]\s*:\s*['"]([^'"]+)['"]/,
      /currentUser['"]\s*:\s*['"]([^'"]+)['"]/,
      /user['"]\s*:\s*['"]([^'"]+)['"]/
    ];

    for (const script of scripts) {
      const content = script.textContent || script.innerHTML;
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1] && this.isValidUsername(match[1])) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Detect user from meta tags
   * @returns {string|null} Username or null
   */
  static detectFromMetaTags() {
    const metaElements = document.querySelectorAll(
      'meta[name*="user"], meta[property*="user"], [data-user], [data-handle]'
    );
    
    for (const meta of metaElements) {
      const content = meta.getAttribute('content') || 
                    meta.getAttribute('data-user') || 
                    meta.getAttribute('data-handle');
      
      if (content && this.isValidUsername(content)) {
        return content;
      }
    }

    return null;
  }

  /**
   * Detect user from navigation
   * @returns {string|null} Username or null
   */
  static detectFromNavigation() {
    const headerSelectors = [
      '.header', '#header', 'nav', '.navigation', 
      '.top-nav', '.main-nav', '.user-nav'
    ];
    
    for (const selector of headerSelectors) {
      const headerArea = document.querySelector(selector);
      if (!headerArea) continue;

      const profileLinks = headerArea.querySelectorAll('a[href*="/profile/"]');
      for (const link of profileLinks) {
        const href = link.getAttribute('href');
        const match = href.match(/\/profile\/([^\/\?\s]+)/);
        if (match && match[1] && this.isValidUsername(match[1])) {
          const linkParent = link.closest('.user-menu, .user-info, .profile-menu');
          if (linkParent || link.textContent.trim().length < 20) {
            return match[1];
          }
        }
      }
    }

    return null;
  }

  /**
   * Detect user from profile page
   * @returns {string|null} Username or null
   */
  static detectFromProfilePage() {
    if (!window.location.pathname.includes('/profile/')) return null;

    const match = window.location.pathname.match(/\/profile\/([^\/\?\s]+)/);
    if (!match || !match[1]) return null;

    // Check if user has edit access (indicating it's their profile)
    const editProfileBtn = document.querySelector('a[href*="edit"], button[onclick*="edit"]');
    if (editProfileBtn && this.isValidUsername(match[1])) {
      return match[1];
    }

    return null;
  }

  /**
   * Validate username format
   * @param {string} username - Username to validate
   * @returns {boolean} Whether username is valid
   */
  static isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 1 || username.length > 24) return false;
    
    const excludeList = [
      'profile', 'user', 'handle', 'username', 'login', 'logout',
      'admin', 'moderator', 'system', 'codeforces', 'cf',
      'example', 'test', 'demo', 'sample', 'null', 'undefined'
    ];
    
    if (excludeList.includes(username.toLowerCase())) return false;
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
    
    return true;
  }

  /**
   * Verify user and fetch user info
   * @param {string} username - Username to verify
   * @returns {Promise<Object|null>} User info or null
   */
  static async verifyAndFetchUserInfo(username) {
    try {
      window.logger.info('UserDetectionService.verifyAndFetchUserInfo', `Verifying user: ${username}`);
      return await window.apiService.fetchUserInfo(username);
window.UserDetectionService = class {
    } catch (error) {
      window.logger.error('UserDetectionService.verifyAndFetchUserInfo', `Verification failed for ${username}`, error);