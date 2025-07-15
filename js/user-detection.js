// User detection and verification for Codeforces Daily Problems Extension

class UserDetection {
  static async detectUser() {
    console.log('Starting user detection...');
    let detectedUsername = null;

    // Method 1: Check for logout link (most reliable for logged-in users)
    const logoutLink = document.querySelector('a[href*="logout"]');
    if (logoutLink) {
      const navArea = logoutLink.closest('.header, #header, nav, .navigation');
      if (navArea) {
        const profileLinks = navArea.querySelectorAll('a[href*="/profile/"]');
        for (const link of profileLinks) {
          const href = link.getAttribute('href');
          const match = href.match(/\/profile\/([^\/\?\s]+)/);
          if (match && match[1]) {
            const linkText = link.textContent.trim().toLowerCase();
            if (!linkText.includes('profile') && !linkText.includes('view') && linkText.length > 0) {
              detectedUsername = match[1];
              console.log('Found username via logout area:', detectedUsername);
              break;
            }
          }
        }
      }
    }

    // Method 2: Check for user handle in page scripts
    if (!detectedUsername) {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || script.innerHTML;
        
        const patterns = [
          /window\.handle\s*=\s*['"]([^'"]+)['"]/,
          /"handle"\s*:\s*"([^"]+)"/,
          /handle['"]\s*:\s*['"]([^'"]+)['"]/,
          /currentUser['"]\s*:\s*['"]([^'"]+)['"]/,
          /user['"]\s*:\s*['"]([^'"]+)['"]/
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1] && this.isValidUsername(match[1])) {
            detectedUsername = match[1];
            console.log('Found username in scripts:', detectedUsername);
            break;
          }
        }
        if (detectedUsername) break;
      }
    }

    // Method 3: Check for user info in meta tags or data attributes
    if (!detectedUsername) {
      const metaElements = document.querySelectorAll('meta[name*="user"], meta[property*="user"], [data-user], [data-handle]');
      for (const meta of metaElements) {
        const content = meta.getAttribute('content') || meta.getAttribute('data-user') || meta.getAttribute('data-handle');
        if (content && this.isValidUsername(content)) {
          detectedUsername = content;
          console.log('Found username in meta/data:', detectedUsername);
          break;
        }
      }
    }

    // Method 4: Look for profile link in header navigation
    if (!detectedUsername) {
      const headerSelectors = [
        '.header', '#header', 'nav', '.navigation', 
        '.top-nav', '.main-nav', '.user-nav'
      ];
      
      for (const selector of headerSelectors) {
        const headerArea = document.querySelector(selector);
        if (headerArea) {
          const profileLinks = headerArea.querySelectorAll('a[href*="/profile/"]');
          for (const link of profileLinks) {
            const href = link.getAttribute('href');
            const match = href.match(/\/profile\/([^\/\?\s]+)/);
            if (match && match[1] && this.isValidUsername(match[1])) {
              const linkParent = link.closest('.user-menu, .user-info, .profile-menu');
              if (linkParent || link.textContent.trim().length < 20) {
                detectedUsername = match[1];
                console.log('Found username in header navigation:', detectedUsername);
                break;
              }
            }
          }
          if (detectedUsername) break;
        }
      }
    }

    // Method 5: Check if we're on a profile page
    if (!detectedUsername && window.location.pathname.includes('/profile/')) {
      const match = window.location.pathname.match(/\/profile\/([^\/\?\s]+)/);
      if (match && match[1]) {
        const editProfileBtn = document.querySelector('a[href*="edit"], button[onclick*="edit"]');
        if (editProfileBtn) {
          detectedUsername = match[1];
          console.log('Found username from profile page with edit access:', detectedUsername);
        }
      }
    }

    return detectedUsername;
  }

  static isValidUsername(username) {
    if (!username || typeof username !== 'string') return false;
    if (username.length < 1 || username.length > 24) return false;
    
    const excludeList = [
      'profile', 'user', 'handle', 'username', 'login', 'logout',
      'admin', 'moderator', 'system', 'codeforces', 'cf',
      'example', 'test', 'demo', 'sample', 'null', 'undefined',
      'tourist', 'petr', 'radewoosh'
    ];
    
    if (excludeList.includes(username.toLowerCase())) return false;
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
    
    return true;
  }

  static async verifyAndFetchUserInfo(username) {
    try {
      console.log('Verifying user and fetching info:', username);
      const response = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result && data.result.length > 0) {
        console.log('User verification and info fetch successful');
        return data.result[0];
      } else {
        console.log('User verification failed - API returned:', data);
        return null;
      }
    } catch (error) {
      console.error('Error during user verification:', error);
      return null;
    }
  }
}

// Export for use in other files
window.UserDetection = UserDetection;