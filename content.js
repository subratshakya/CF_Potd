// Content script for Codeforces Daily Problems Extension
class CodeforcesDaily {
  constructor() {
    this.currentUser = null;
    this.dailyProblems = null;
    this.isModalOpen = false;
    this.streakData = null;
    this.currentViewDate = new Date();
    this.userSubmissions = null;
    this.userVerified = false;
    this.currentUserRating = null;
    this.init();
  }

  init() {
    // Wait longer for page to fully load and user session to be established
    setTimeout(() => {
      this.detectUser();
    }, 2000);
  }

  async detectUser() {
    console.log('Starting user detection...');
    let detectedUsername = null;

    // Method 1: Check for logout link (most reliable for logged-in users)
    const logoutLink = document.querySelector('a[href*="logout"]');
    if (logoutLink) {
      // If logout link exists, user is logged in
      // Look for profile link in the same navigation area
      const navArea = logoutLink.closest('.header, #header, nav, .navigation');
      if (navArea) {
        const profileLinks = navArea.querySelectorAll('a[href*="/profile/"]');
        for (const link of profileLinks) {
          const href = link.getAttribute('href');
          const match = href.match(/\/profile\/([^\/\?\s]+)/);
          if (match && match[1]) {
            // Verify this is not a generic profile link
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

    // Method 2: Check for user handle in page scripts (most reliable)
    if (!detectedUsername) {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || script.innerHTML;
        
        // Look for window.handle or similar patterns that indicate current user
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

    // Method 4: Look for profile link in header navigation (with strict validation)
    if (!detectedUsername) {
      // Only look in header/navigation areas, not in content
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
              // Additional validation: check if this link is in user menu area
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

    // Method 5: Check if we're on a profile page and it's the current user's profile
    if (!detectedUsername && window.location.pathname.includes('/profile/')) {
      const match = window.location.pathname.match(/\/profile\/([^\/\?\s]+)/);
      if (match && match[1]) {
        // Only consider this if there's evidence this is the current user's profile
        const editProfileBtn = document.querySelector('a[href*="edit"], button[onclick*="edit"]');
        if (editProfileBtn) {
          detectedUsername = match[1];
          console.log('Found username from profile page with edit access:', detectedUsername);
        }
      }
    }

    // Clear any cached user data if user changed
    const previousUser = await this.getStorageData('cf-current-user');
    if (previousUser !== detectedUsername) {
      console.log('User changed from', previousUser, 'to', detectedUsername);
      await this.clearUserCache();
      await this.setStorageData('cf-current-user', detectedUsername);
    }

    // If no user detected, user is likely not logged in
    if (!detectedUsername) {
      console.log('No user detected - treating as guest');
      this.currentUser = null;
      this.currentUserRating = null;
      this.userVerified = true;
      this.createFloatingButton();
      this.createModal();
      this.loadStreakData();
      this.loadDailyProblems();
      return;
    }

    // Verify the detected user and get fresh rating
    console.log('Attempting to verify user and fetch rating:', detectedUsername);
    const userInfo = await this.verifyAndFetchUserInfo(detectedUsername);
    
    if (userInfo) {
      this.currentUser = detectedUsername;
      this.currentUserRating = userInfo.rating || 1200;
      this.userVerified = true;
      console.log('User verified successfully:', this.currentUser, 'Rating:', this.currentUserRating);
    } else {
      console.log('User verification failed - treating as guest');
      this.currentUser = null;
      this.currentUserRating = null;
      this.userVerified = true;
    }

    // Initialize the rest of the extension
    this.createFloatingButton();
    this.createModal();
    this.loadStreakData();
    this.loadDailyProblems();
  }

  async clearUserCache() {
    try {
      // Clear user-specific cached data
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

  async getAllStorageKeys() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(Object.keys(items));
      });
    });
  }

  async removeStorageData(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    });
  }

  isValidUsername(username) {
    // Validate username format and exclude common false positives
    if (!username || typeof username !== 'string') return false;
    if (username.length < 1 || username.length > 24) return false;
    
    // Exclude common false positives
    const excludeList = [
      'profile', 'user', 'handle', 'username', 'login', 'logout',
      'admin', 'moderator', 'system', 'codeforces', 'cf',
      'example', 'test', 'demo', 'sample', 'null', 'undefined',
      'tourist', 'petr', 'radewoosh' // Exclude famous users that appear in examples
    ];
    
    if (excludeList.includes(username.toLowerCase())) return false;
    
    // Check for valid username pattern (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
    
    return true;
  }

  async verifyAndFetchUserInfo(username) {
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

  createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'cf-daily-button';
    button.innerHTML = `
      <div class="cf-daily-fab">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
        </svg>
        <span>Daily</span>
      </div>
    `;
    
    button.addEventListener('click', () => this.openModal());
    document.body.appendChild(button);
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'cf-daily-modal';
    modal.innerHTML = `
      <div class="cf-modal-overlay">
        <div class="cf-modal-content">
          <div class="cf-modal-header">
            <h2>Daily Problems</h2>
            <div class="cf-modal-tabs">
              <button class="cf-tab-btn cf-tab-active" data-tab="problems">Problems</button>
              <button class="cf-tab-btn" data-tab="calendar">Calendar</button>
            </div>
            <button class="cf-modal-close" id="cf-modal-close">×</button>
          </div>
          <div class="cf-modal-body" id="cf-modal-body">
            <div class="cf-loading">
              <div class="cf-spinner"></div>
              <p>Loading problems...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.cf-modal-overlay')) {
        this.closeModal();
      }
    });

    modal.querySelector('#cf-modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Tab switching
    modal.querySelectorAll('.cf-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    document.body.appendChild(modal);
  }

  switchTab(tab) {
    const modal = document.getElementById('cf-daily-modal');
    const tabs = modal.querySelectorAll('.cf-tab-btn');
    
    tabs.forEach(t => t.classList.remove('cf-tab-active'));
    modal.querySelector(`[data-tab="${tab}"]`).classList.add('cf-tab-active');

    if (tab === 'problems') {
      this.displayProblems();
    } else if (tab === 'calendar') {
      this.displayCalendar();
    }
  }

  async loadStreakData() {
    try {
      const streakKey = this.currentUser ? `cf-streak-${this.currentUser}` : 'cf-streak-guest';
      const streakData = await this.getStorageData(streakKey);
      
      this.streakData = streakData || {
        randomStreak: 0,
        ratingStreak: 0,
        lastRandomSolve: null,
        lastRatingSolve: null,
        solvedDates: {},
        currentRandomStreak: 0,
        currentRatingStreak: 0
      };
    } catch (error) {
      console.error('Error loading streak data:', error);
      this.streakData = {
        randomStreak: 0,
        ratingStreak: 0,
        lastRandomSolve: null,
        lastRatingSolve: null,
        solvedDates: {},
        currentRandomStreak: 0,
        currentRatingStreak: 0
      };
    }
  }

  async saveStreakData() {
    try {
      const streakKey = this.currentUser ? `cf-streak-${this.currentUser}` : 'cf-streak-guest';
      await this.setStorageData(streakKey, this.streakData);
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }

  async fetchUserSubmissions(date = new Date()) {
    if (!this.currentUser || !this.userVerified) {
      return null;
    }

    try {
      // Get submissions from the start of the day to end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await fetch(`https://codeforces.com/api/user.status?handle=${this.currentUser}&from=1&count=100`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error('Failed to fetch submissions:', data);
        return null;
      }

      // Filter submissions for the specific date and only accepted ones
      const daySubmissions = data.result.filter(submission => {
        const submissionTime = new Date(submission.creationTimeSeconds * 1000);
        return submissionTime >= startOfDay && 
               submissionTime <= endOfDay && 
               submission.verdict === 'OK';
      });

      return daySubmissions;
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      return null;
    }
  }

  async checkProblemsSolved(date = new Date()) {
    if (!this.currentUser || !this.userVerified || !this.dailyProblems) {
      return { random: false, rating: false };
    }

    const submissions = await this.fetchUserSubmissions(date);
    if (!submissions) {
      return { random: false, rating: false };
    }

    const { ratingBased, random } = this.dailyProblems;
    let randomSolved = false;
    let ratingSolved = false;

    // Check if any submission matches our daily problems
    submissions.forEach(submission => {
      const problemId = `${submission.problem.contestId}${submission.problem.index}`;
      
      if (random && `${random.contestId}${random.index}` === problemId) {
        randomSolved = true;
      }
      
      if (ratingBased && `${ratingBased.contestId}${ratingBased.index}` === problemId) {
        ratingSolved = true;
      }
    });

    // Update streak data if problems were solved today
    const today = new Date();
    const isToday = this.formatDateKey(date) === this.formatDateKey(today);
    
    if (isToday) {
      const dateKey = this.formatDateKey(date);
      if (!this.streakData.solvedDates[dateKey]) {
        this.streakData.solvedDates[dateKey] = {};
      }

      let updated = false;
      
      if (randomSolved && !this.streakData.solvedDates[dateKey].random) {
        this.streakData.solvedDates[dateKey].random = true;
        this.streakData.lastRandomSolve = today.toDateString();
        this.updateRandomStreak();
        updated = true;
      }
      
      if (ratingSolved && !this.streakData.solvedDates[dateKey].rating) {
        this.streakData.solvedDates[dateKey].rating = true;
        this.streakData.lastRatingSolve = today.toDateString();
        this.updateRatingStreak();
        updated = true;
      }

      if (updated) {
        await this.saveStreakData();
      }
    }

    return { random: randomSolved, rating: ratingSolved };
  }

  updateRandomStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = this.formatDateKey(checkDate);
      
      if (this.streakData.solvedDates[dateKey]?.random) {
        streak++;
      } else {
        break;
      }
    }
    
    this.streakData.currentRandomStreak = streak;
    this.streakData.randomStreak = Math.max(this.streakData.randomStreak, streak);
  }

  updateRatingStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = this.formatDateKey(checkDate);
      
      if (this.streakData.solvedDates[dateKey]?.rating) {
        streak++;
      } else {
        break;
      }
    }
    
    this.streakData.currentRatingStreak = streak;
    this.streakData.ratingStreak = Math.max(this.streakData.ratingStreak, streak);
  }

  formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  // Get universal date key in UTC to ensure same problems globally
  getUniversalDateKey(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  async loadDailyProblems(date = new Date()) {
    try {
      const universalDateKey = this.getUniversalDateKey(date);
      
      // Check for global random problem cache (same for all users)
      const globalCacheKey = `cf-global-cache-${universalDateKey}`;
      const globalCache = await this.getStorageData(globalCacheKey);
      
      // Check for user-specific rating problem cache
      let userRatingCache = null;
      if (this.currentUser && this.currentUserRating) {
        const userCacheKey = `cf-user-cache-${this.currentUser}-${universalDateKey}`;
        userRatingCache = await this.getStorageData(userCacheKey);
      }
      
      // If we have both caches, use them
      if (globalCache && (!this.currentUser || userRatingCache)) {
        this.dailyProblems = {
          userRating: this.currentUserRating || 1200,
          isLoggedIn: !!(this.currentUser && this.userVerified),
          ratingBased: userRatingCache?.ratingProblem || null,
          random: globalCache.randomProblem,
          date: this.formatDateKey(date)
        };
        console.log('Loaded problems from cache');
        return;
      }

      // Fetch new problems for the specific date
      await this.fetchDailyProblems(date);
    } catch (error) {
      console.error('Error loading daily problems:', error);
    }
  }

  async fetchDailyProblems(date = new Date()) {
    try {
      const userRating = this.currentUserRating || 1200;

      // Fetch all problems
      const problemsResponse = await fetch('https://codeforces.com/api/problemset.problems');
      const problemsData = await problemsResponse.json();
      
      if (problemsData.status !== 'OK') {
        throw new Error('Failed to fetch problems');
      }

      const problems = problemsData.result.problems;
      
      // Filter problems for user rating range (x-100 to x+300)
      const ratingBasedProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= (userRating - 100) && 
        problem.rating <= (userRating + 300)
      );

      // Filter problems for random selection (800-3500)
      const allProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= 800 && 
        problem.rating <= 3500
      );

      // Use universal date key for consistent problem selection globally
      const universalDateKey = this.getUniversalDateKey(date);
      
      // Select problems based on universal date (same for everyone worldwide)
      const ratingProblem = this.selectDailyProblem(ratingBasedProblems, universalDateKey, 'rating');
      const randomProblem = this.selectDailyProblem(allProblems, universalDateKey, 'random');

      this.dailyProblems = {
        userRating,
        isLoggedIn: !!(this.currentUser && this.userVerified),
        ratingBased: ratingProblem,
        random: randomProblem,
        date: this.formatDateKey(date)
      };

      // Cache the problems separately
      const globalCacheKey = `cf-global-cache-${universalDateKey}`;
      await this.setStorageData(globalCacheKey, {
        randomProblem: randomProblem,
        cachedAt: Date.now()
      });

      // Cache user-specific rating problem if logged in
      if (this.currentUser && this.currentUserRating) {
        const userCacheKey = `cf-user-cache-${this.currentUser}-${universalDateKey}`;
        await this.setStorageData(userCacheKey, {
          ratingProblem: ratingProblem,
          userRating: userRating,
          cachedAt: Date.now()
        });
      }

      console.log('Fetched and cached new problems');

    } catch (error) {
      console.error('Error fetching daily problems:', error);
      this.dailyProblems = { error: 'Failed to load problems. Please try again later.' };
    }
  }

  getRatingClass(rating) {
    if (rating < 1200) return 'newbie';
    if (rating < 1400) return 'pupil';
    if (rating < 1600) return 'specialist';
    if (rating < 1900) return 'expert';
    if (rating < 2100) return 'candidate-master';
    if (rating < 2300) return 'master';
    if (rating < 2400) return 'international-master';
    if (rating < 2600) return 'grandmaster';
    if (rating < 3000) return 'international-grandmaster';
    return 'legendary-grandmaster';
  }

  getRankTitle(rating) {
    if (rating < 1200) return 'Newbie';
    if (rating < 1400) return 'Pupil';
    if (rating < 1600) return 'Specialist';
    if (rating < 1900) return 'Expert';
    if (rating < 2100) return 'Candidate Master';
    if (rating < 2300) return 'Master';
    if (rating < 2400) return 'International Master';
    if (rating < 2600) return 'Grandmaster';
    if (rating < 3000) return 'International Grandmaster';
    return 'Legendary Grandmaster';
  }

  selectDailyProblem(problems, dateKey, type) {
    if (problems.length === 0) return null;
    // Use universal date key and type as seed for consistent daily problems globally
    const seed = this.hashCode(dateKey + type + 'cf-daily-2024');
    const index = Math.abs(seed) % problems.length;
    return problems[index];
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  openModal() {
    const modal = document.getElementById('cf-daily-modal');
    modal.style.display = 'flex';
    this.isModalOpen = true;
    
    // Add animation class
    setTimeout(() => {
      modal.classList.add('cf-modal-open');
    }, 10);

    this.displayProblems();
  }

  closeModal() {
    const modal = document.getElementById('cf-daily-modal');
    modal.classList.remove('cf-modal-open');
    
    setTimeout(() => {
      modal.style.display = 'none';
      this.isModalOpen = false;
    }, 200);
  }

  async displayProblems() {
    const modalBody = document.getElementById('cf-modal-body');
    
    if (!this.dailyProblems) {
      modalBody.innerHTML = `
        <div class="cf-loading">
          <div class="cf-spinner"></div>
          <p>Loading problems...</p>
        </div>
      `;
      return;
    }

    if (this.dailyProblems.error) {
      modalBody.innerHTML = `
        <div class="cf-error">
          <p>${this.dailyProblems.error}</p>
          <button onclick="location.reload()" class="cf-retry-btn">Retry</button>
        </div>
      `;
      return;
    }

    // Check if problems are solved by fetching submissions
    const problemDate = new Date(this.dailyProblems.date);
    const solvedStatus = await this.checkProblemsSolved(problemDate);

    const { userRating, isLoggedIn, ratingBased, random } = this.dailyProblems;
    const ratingClass = this.getRatingClass(userRating);
    const rankTitle = this.getRankTitle(userRating);
    
    const today = new Date();
    const todayKey = this.formatDateKey(today);
    const isToday = this.dailyProblems.date === todayKey;
    
    modalBody.innerHTML = `
      <div class="cf-problems-container">
        ${this.streakData ? `
          <div class="cf-streak-section">
            <div class="cf-streak-item">
              <div class="cf-streak-icon">🔥</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${this.streakData.currentRandomStreak}</div>
                <div class="cf-streak-label">Random Streak</div>
                <div class="cf-streak-best">Best: ${this.streakData.randomStreak}</div>
              </div>
            </div>
            <div class="cf-streak-item">
              <div class="cf-streak-icon">🚀</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${this.streakData.currentRatingStreak}</div>
                <div class="cf-streak-label">Rating Streak</div>
                <div class="cf-streak-best">Best: ${this.streakData.ratingStreak}</div>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="cf-user-info">
          ${isLoggedIn ? 
            `<h3><span class="cf-username cf-username-${ratingClass}">${this.currentUser}</span> ${this.userVerified ? '✓' : '⚠️'}</h3>
             <p>${rankTitle} • Rating: <span class="cf-rating">${userRating}</span></p>
             ${!this.userVerified ? '<p class="cf-warning">⚠️ User verification failed - data may be inaccurate</p>' : ''}` :
            `<h3>Guest User</h3>
             <p>Log in to get personalized problems and automatic tracking</p>`
          }
          ${!isToday ? `<p class="cf-date-info">Problems for ${new Date(this.dailyProblems.date).toLocaleDateString()}</p>` : ''}
        </div>
        
        <div class="cf-problem-section">
          <h4>${isLoggedIn ? 'Rating-Based Problem' : 'Beginner Problem'}</h4>
          <p class="cf-section-desc">${isLoggedIn ? 'Problem tailored to your skill level' : 'Problem for rating 1100-1500'}</p>
          ${this.renderProblemCard(ratingBased, 'rating', solvedStatus.rating)}
        </div>
        
        <div class="cf-problem-section">
          <h4>Daily Random Problem</h4>
          <p class="cf-section-desc">Universal challenge for all users (same globally)</p>
          ${this.renderProblemCard(random, 'random', solvedStatus.random)}
        </div>
      </div>
    `;
  }

  renderProblemCard(problem, type, isSolved = false) {
    if (!problem) {
      return `
        <div class="cf-problem-card cf-problem-unavailable">
          <p>No suitable problem found.</p>
        </div>
      `;
    }

    const ratingClass = `cf-rating-${Math.floor(problem.rating / 100) * 100}`;
    const problemUrl = `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
    
    return `
      <div class="cf-problem-card ${isSolved ? 'cf-problem-solved' : ''}" data-type="${type}">
        <div class="cf-problem-header">
          <a href="${problemUrl}" target="_blank" class="cf-problem-title">${problem.name}</a>
          <div class="cf-problem-header-right">
            <span class="cf-problem-rating ${ratingClass}">${problem.rating}</span>
            ${isSolved ? '<span class="cf-solved-badge">✓</span>' : ''}
          </div>
        </div>
        <div class="cf-problem-meta">
          <span class="cf-problem-id">${problem.contestId}${problem.index}</span>
          <div class="cf-problem-tags">
            ${problem.tags.slice(0, 3).map(tag => `<a href="#" class="cf-tag">${tag}</a>`).join(', ')}
          </div>
        </div>
        <div class="cf-problem-actions">
          <a href="${problemUrl}" target="_blank" class="cf-solve-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Solve
          </a>
          ${isSolved ? `
            <span class="cf-solved-status">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Solved
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  displayCalendar() {
    const modalBody = document.getElementById('cf-modal-body');
    const currentDate = new Date(this.currentViewDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    let calendarHTML = `
      <div class="cf-calendar-container">
        <div class="cf-calendar-header">
          <button class="cf-calendar-nav" data-direction="-1">‹</button>
          <h3>${monthNames[month]} ${year}</h3>
          <button class="cf-calendar-nav" data-direction="1">›</button>
        </div>
        <div class="cf-calendar-grid">
          <div class="cf-calendar-weekdays">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div class="cf-calendar-days">
    `;
    
    const today = new Date();
    const todayKey = this.formatDateKey(today);
    
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const dateKey = this.formatDateKey(cellDate);
      
      const isCurrentMonth = cellDate.getMonth() === month;
      const isToday = dateKey === todayKey;
      const isPast = cellDate < today;
      const isFuture = cellDate > today;
      
      const solvedData = this.streakData?.solvedDates[dateKey];
      const hasRandomSolved = solvedData?.random || false;
      const hasRatingSolved = solvedData?.rating || false;
      
      let dayClass = 'cf-calendar-day';
      if (!isCurrentMonth) dayClass += ' cf-calendar-day-other-month';
      if (isToday) dayClass += ' cf-calendar-day-today';
      if (isFuture) dayClass += ' cf-calendar-day-future';
      
      calendarHTML += `
        <div class="${dayClass}" data-date="${dateKey}">
          <div class="cf-calendar-day-number">${cellDate.getDate()}</div>
          ${(isPast || isToday) && isCurrentMonth ? `
            <div class="cf-calendar-day-indicators">
              <span class="cf-calendar-indicator ${hasRandomSolved ? 'cf-solved' : ''}" title="Random Problem">🔥</span>
              <span class="cf-calendar-indicator ${hasRatingSolved ? 'cf-solved' : ''}" title="Rating Problem">🚀</span>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    calendarHTML += `
          </div>
        </div>
        <div class="cf-calendar-legend">
          <div class="cf-legend-item">
            <span class="cf-calendar-indicator cf-solved">🔥</span>
            <span>Random Problem Solved</span>
          </div>
          <div class="cf-legend-item">
            <span class="cf-calendar-indicator cf-solved">🚀</span>
            <span>Rating Problem Solved</span>
          </div>
        </div>
      </div>
    `;
    
    modalBody.innerHTML = calendarHTML;
    
    // Add event listeners for calendar navigation
    modalBody.querySelectorAll('.cf-calendar-nav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const direction = parseInt(e.target.dataset.direction);
        this.changeMonth(direction);
      });
    });
    
    // Add event listeners for date selection
    modalBody.querySelectorAll('.cf-calendar-day').forEach(day => {
      day.addEventListener('click', (e) => {
        const dateKey = e.currentTarget.dataset.date;
        if (dateKey && !e.currentTarget.classList.contains('cf-calendar-day-future')) {
          this.selectCalendarDate(dateKey);
        }
      });
    });
  }

  changeMonth(direction) {
    this.currentViewDate.setMonth(this.currentViewDate.getMonth() + direction);
    this.displayCalendar();
  }

  async selectCalendarDate(dateKey) {
    const selectedDate = new Date(dateKey + 'T00:00:00');
    const today = new Date();
    
    // Don't allow future dates
    if (selectedDate > today) {
      return;
    }
    
    console.log('Loading problems for date:', dateKey);
    
    // Load problems for selected date
    await this.loadDailyProblems(selectedDate);
    
    // Switch to problems tab
    this.switchTab('problems');
  }

  async getStorageData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async setStorageData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
}

// Initialize the extension when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.cfDaily = new CodeforcesDaily();
  });
} else {
  window.cfDaily = new CodeforcesDaily();
}