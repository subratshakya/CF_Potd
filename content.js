// Content script for Codeforces Daily Problems Extension
class CodeforcesDaily {
  constructor() {
    this.currentUser = null;
    this.dailyProblems = null;
    this.isModalOpen = false;
    this.streakData = null;
    this.currentUserRating = null;
    this.countdownInterval = null;
    this.userVerified = false;
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

    document.body.appendChild(modal);
  }

  // ===== CONSECUTIVE DAY STREAK SYSTEM =====

  async loadStreakData() {
    try {
      const streakKey = this.currentUser ? `cf-streak-${this.currentUser}` : 'cf-streak-guest';
      const streakData = await this.getStorageData(streakKey);
      
      this.streakData = streakData || {
        currentStreak: 0,
        maxStreak: 0,
        completedDays: {}, // Format: 'YYYY-MM-DD': { solved: true, timestamp: number, problems: ['problemId1', 'problemId2'] }
        lastCompletedDate: null
      };

      console.log('Loaded streak data:', this.streakData);
      
      // Check if streak should be reset due to missed days
      await this.checkAndResetStreakIfNeeded();
    } catch (error) {
      console.error('Error loading streak data:', error);
      this.streakData = {
        currentStreak: 0,
        maxStreak: 0,
        completedDays: {},
        lastCompletedDate: null
      };
    }
  }

  async saveStreakData() {
    try {
      const streakKey = this.currentUser ? `cf-streak-${this.currentUser}` : 'cf-streak-guest';
      await this.setStorageData(streakKey, this.streakData);
      console.log('Streak data saved:', this.streakData);
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }

  // Get UTC date string in YYYY-MM-DD format
  getUTCDateString(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  // Get time until next UTC day (00:00 UTC)
  getTimeUntilNextUTCDay() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    
    // Next day at 00:00 UTC
    const nextDay = new Date(utcNow);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    nextDay.setUTCHours(0, 0, 0, 0);
    
    const timeLeft = nextDay.getTime() - utcNow.getTime();
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      totalMs: timeLeft
    };
  }

  // Check if streak should be reset due to missed days
  async checkAndResetStreakIfNeeded() {
    if (!this.streakData.lastCompletedDate || this.streakData.currentStreak === 0) {
      return; // No streak to check or already at 0
    }

    const today = this.getUTCDateString();
    const lastCompleted = this.streakData.lastCompletedDate;
    
     // Calculate days between last completed and today using UTC date strings
     const daysDiff = this.calculateUTCDaysDifference(lastCompleted, today);
    
    console.log('Checking streak reset:', {
      today,
      lastCompleted,
      daysDiff,
      currentStreak: this.streakData.currentStreak
    });

    // If more than 1 day gap, reset streak
    if (daysDiff > 1) {
      console.log('Resetting streak due to missed days');
      this.streakData.currentStreak = 0;
      await this.saveStreakData();
    }
  }

  // Check if user solved today's problems
  async checkTodaysSolutions() {
    if (!this.currentUser || !this.userVerified || !this.dailyProblems) {
      console.log('Cannot check solutions - user not verified or no problems loaded');
      return false;
    }

    const today = this.getUTCDateString();
    
    // If already marked as completed today, don't check again
    if (this.streakData.completedDays[today]) {
      console.log('Today already marked as completed');
      return true;
    }

    console.log('Checking if user solved today\'s problems...');
    
    try {
      // Get recent submissions (last 100 to be thorough)
      const response = await fetch(`https://codeforces.com/api/user.status?handle=${this.currentUser}&from=1&count=100`);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error('Failed to fetch submissions:', data);
        return false;
      }

      const submissions = data.result;
      const { ratingBased, random } = this.dailyProblems;
      
      // Get today's UTC date string for problem matching
      const todayUTC = this.getUTCDateString();
      
      // Parse today's date boundaries in UTC
      const todayStart = new Date(todayUTC + 'T00:00:00.000Z');
      const todayEnd = new Date(todayUTC + 'T23:59:59.999Z');

      console.log('Checking submissions between:', todayStart, 'and', todayEnd);
      console.log('Today UTC date:', todayUTC);
      console.log('Looking for problems:', 
        ratingBased ? `${ratingBased.contestId}${ratingBased.index}` : 'none', 
        'and', 
        random ? `${random.contestId}${random.index}` : 'none'
      );

      // Check if any submission today matches our daily problems
      const solvedProblems = [];
      
      for (const submission of submissions) {
        const submissionTime = new Date(submission.creationTimeSeconds * 1000);
        const submissionUTCDate = this.getUTCDateString(submissionTime);
        
        // Check if submission is from today (UTC) and is accepted
        if (submissionUTCDate === todayUTC && submission.verdict === 'OK') {
          const problemId = `${submission.problem.contestId}${submission.problem.index}`;
          
          console.log('Found accepted submission:', {
            problemId,
            submissionTime: submissionTime.toISOString(),
            submissionUTCDate,
            todayUTC
          });
          
          // Check if this matches any of our daily problems
          if (ratingBased && `${ratingBased.contestId}${ratingBased.index}` === problemId) {
            solvedProblems.push(problemId);
            console.log('Found solved rating-based problem:', problemId);
          }
          
          if (random && `${random.contestId}${random.index}` === problemId) {
            solvedProblems.push(problemId);
            console.log('Found solved random problem:', problemId);
          }
        }
      }

      // If user solved at least one daily problem today, mark day as completed
      if (solvedProblems.length > 0) {
        console.log('User solved daily problems today:', solvedProblems);
        await this.markDayCompleted(today, solvedProblems);
        return true;
      }

      console.log('No daily problems solved today');
      return false;
    } catch (error) {
      console.error('Error checking today\'s solutions:', error);
      return false;
    }
  }

  // Mark a day as completed and update streak
  async markDayCompleted(dateString, solvedProblems = []) {
    console.log('Marking day completed:', dateString, 'with problems:', solvedProblems);
    
    // Mark the day as completed
    this.streakData.completedDays[dateString] = {
      solved: true,
      timestamp: Date.now(),
      problems: solvedProblems
    };
    
     // Update streak logic for consecutive days using proper UTC date calculation
     const yesterday = this.getYesterdayUTCString();
     const isFirstDay = this.streakData.currentStreak === 0;
     const isConsecutive = isFirstDay || this.streakData.lastCompletedDate === yesterday;
     
     console.log('Streak calculation:', {
       dateString,
       yesterday,
       lastCompletedDate: this.streakData.lastCompletedDate,
       isFirstDay,
       isConsecutive,
       currentStreak: this.streakData.currentStreak
     });
    
    if (isConsecutive) {
      // Consecutive day - increment streak
      this.streakData.currentStreak += 1;
    } else {
      // Not consecutive - start new streak
      this.streakData.currentStreak = 1;
    }
    
    this.streakData.lastCompletedDate = dateString;
    this.streakData.maxStreak = Math.max(this.streakData.maxStreak, this.streakData.currentStreak);
    
    console.log('Updated streak:', {
      currentStreak: this.streakData.currentStreak,
      maxStreak: this.streakData.maxStreak,
      lastCompletedDate: this.streakData.lastCompletedDate,
      isConsecutive
    });
    
    await this.saveStreakData();
  }

  // Get yesterday's UTC date string
  getYesterdayUTCString() {
    const yesterday = new Date();
     const utcYesterday = new Date(yesterday.getTime() + (yesterday.getTimezoneOffset() * 60000));
     utcYesterday.setUTCDate(utcYesterday.getUTCDate() - 1);
    return this.getUTCDateString(yesterday);
  }

  // Check if today is completed
  isTodayCompleted() {
    const today = this.getUTCDateString();
    return !!(this.streakData.completedDays[today]);
  }

   // Calculate difference in days between two UTC date strings
   calculateUTCDaysDifference(dateString1, dateString2) {
     const date1 = new Date(dateString1 + 'T00:00:00.000Z');
     const date2 = new Date(dateString2 + 'T00:00:00.000Z');
     const diffTime = Math.abs(date2 - date1);
     return Math.floor(diffTime / (1000 * 60 * 60 * 24));
   }

  // ===== END CONSECUTIVE DAY STREAK SYSTEM =====

  formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  // Get universal date key in UTC to ensure same problems globally
  getUniversalDateKey(date = new Date()) {
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    return utcDate.toISOString().split('T')[0];
  }

  // Get time until next day in UTC (when new problems are released)
  getTimeUntilNextProblems() {
    return this.getTimeUntilNextUTCDay();
  }

  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.updateCountdownDisplay();
    }, 1000);
  }

  updateCountdownDisplay() {
    const countdownElement = document.querySelector('.cf-countdown-timer');
    if (!countdownElement) return;

    const timeLeft = this.getTimeUntilNextProblems();
    
    if (timeLeft.totalMs <= 0) {
      // Time's up! Check if streak should be reset and reload problems
      this.checkAndResetStreakIfNeeded().then(() => {
        countdownElement.innerHTML = `
          <div class="cf-countdown-expired">
            <span class="cf-countdown-icon">🎉</span>
            <span>New problems available!</span>
            <button class="cf-refresh-btn" onclick="location.reload()">Refresh</button>
          </div>
        `;
      });
      clearInterval(this.countdownInterval);
      return;
    }

    countdownElement.innerHTML = `
      <div class="cf-countdown-display">
        <span class="cf-countdown-icon">⏰</span>
        <span class="cf-countdown-label">Next problems in:</span>
        <span class="cf-countdown-time">${timeLeft.hours}:${timeLeft.minutes}:${timeLeft.seconds}</span>
      </div>
    `;
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
        
        // Check if user solved today's problems after loading
        if (this.formatDateKey(date) === this.getUTCDateString()) {
          await this.checkTodaysSolutions();
        }
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

      // Check if user solved today's problems after fetching
      if (this.formatDateKey(date) === this.getUTCDateString()) {
        await this.checkTodaysSolutions();
      }

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

    // Clear countdown interval when modal is closed
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
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

    // Check if problems are solved by checking submissions
    const today = this.getUTCDateString();
    const isToday = this.dailyProblems.date === today;
    
    // If viewing today's problems, check for solutions
    if (isToday) {
      await this.checkTodaysSolutions();
    }

    const { userRating, isLoggedIn, ratingBased, random } = this.dailyProblems;
    const ratingClass = this.getRatingClass(userRating);
    const rankTitle = this.getRankTitle(userRating);
    
    const todayCompleted = this.isTodayCompleted();
    
    modalBody.innerHTML = `
      <div class="cf-problems-container">
        ${isToday ? `
          <div class="cf-countdown-section">
            <div class="cf-countdown-timer">
              <div class="cf-countdown-display">
                <span class="cf-countdown-icon">⏰</span>
                <span class="cf-countdown-label">Next problems in:</span>
                <span class="cf-countdown-time">Loading...</span>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${this.streakData ? `
          <div class="cf-streak-section">
            <div class="cf-streak-item">
              <div class="cf-streak-icon">🔥</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${this.streakData.currentStreak}</div>
                <div class="cf-streak-label">Current Streak</div>
                <div class="cf-streak-best">Best: ${this.streakData.maxStreak}</div>
              </div>
            </div>
            <div class="cf-streak-item">
              <div class="cf-streak-icon">📅</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${todayCompleted ? '✓' : '○'}</div>
                <div class="cf-streak-label">Today's Status</div>
                <div class="cf-streak-best">${todayCompleted ? 'Completed' : 'Pending'}</div>
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
          ${this.renderProblemCard(ratingBased, 'rating', todayCompleted)}
        </div>
        
        <div class="cf-problem-section">
          <h4>Daily Random Problem</h4>
          <p class="cf-section-desc">Universal challenge for all users (same globally)</p>
          ${this.renderProblemCard(random, 'random', todayCompleted)}
        </div>
        
        ${isLoggedIn ? `
          <div class="cf-refresh-section">
            <button class="cf-refresh-solutions-btn" onclick="window.cfDaily.checkTodaysSolutions().then(() => window.cfDaily.displayProblems())">
              🔄 Check for New Solutions
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // Start countdown if viewing today's problems
    if (isToday) {
      this.startCountdown();
    }
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