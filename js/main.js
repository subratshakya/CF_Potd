// Main controller for Codeforces Daily Problems Extension

class CodeforcesDaily {
  constructor() {
    this.currentUser = null;
    this.dailyProblems = null;
    this.isModalOpen = false;
    this.streakManager = new StreakManager();
    this.currentUserRating = null;
    this.countdownInterval = null;
    this.userVerified = false;
    this.isCalendarView = false;
    this.selectedDate = null;
    this.calendarDate = new Date();
    this.init();
  }

  init() {
    setTimeout(() => {
      this.detectUser();
    }, 2000);
  }

  async detectUser() {
    const detectedUsername = await UserDetection.detectUser();

    // Clear any cached user data if user changed
    const previousUser = await StorageManager.getStorageData('cf-current-user');
    if (previousUser !== detectedUsername) {
      console.log('User changed from', previousUser, 'to', detectedUsername);
      await StorageManager.clearUserCache();
      await StorageManager.setStorageData('cf-current-user', detectedUsername);
    }

    // If no user detected, user is likely not logged in
    if (!detectedUsername) {
      console.log('No user detected - treating as guest');
      this.currentUser = null;
      this.currentUserRating = null;
      this.userVerified = true;
      this.createFloatingButton();
      this.createModal();
      await this.streakManager.loadStreakData(this.currentUser);
      await this.loadDailyProblems();
      return;
    }

    // Verify the detected user and get fresh rating
    console.log('Attempting to verify user and fetch rating:', detectedUsername);
    const userInfo = await UserDetection.verifyAndFetchUserInfo(detectedUsername);
    
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
    await this.streakManager.loadStreakData(this.currentUser);
    await this.loadDailyProblems();
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
            ${UIRenderer.renderLoadingState()}
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

  async loadDailyProblems(date = new Date()) {
    try {
      this.dailyProblems = await ProblemFetcher.loadDailyProblems(
        this.currentUser, 
        this.currentUserRating, 
        this.userVerified, 
        date
      );
      
      // Check if user solved today's problems after loading
      if (ProblemFetcher.formatDateKey(date) === this.streakManager.getUTCDateString()) {
        await this.checkTodaysSolutions();
      }
    } catch (error) {
      console.error('Error loading daily problems:', error);
      this.dailyProblems = { error: 'Failed to load problems. Please try again later.' };
    }
  }

  async checkTodaysSolutions() {
    return await ProblemFetcher.checkTodaysSolutions(
      this.currentUser, 
      this.userVerified, 
      this.dailyProblems, 
      this.streakManager
    );
  }

  openModal() {
    const modal = document.getElementById('cf-daily-modal');
    modal.style.display = 'flex';
    this.isModalOpen = true;
    
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

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  toggleCalendarView() {
    this.isCalendarView = !this.isCalendarView;
    if (this.isCalendarView) {
      this.calendarDate = new Date();
    }
    this.displayProblems();
  }

  changeCalendarMonth(direction) {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + direction);
    this.displayProblems();
  }

  async viewDateProblems(dateString) {
    this.selectedDate = dateString;
    this.isCalendarView = false;
    const date = new Date(dateString + 'T00:00:00.000Z');
    await this.loadDailyProblems(date);
    this.displayProblems();
  }

  displayCalendar() {
    const modalBody = document.getElementById('cf-modal-body');
    modalBody.innerHTML = Calendar.generateCalendar(this.streakManager, this.calendarDate);
  }

  async displayProblems() {
    const modalBody = document.getElementById('cf-modal-body');
    
    if (this.isCalendarView) {
      this.displayCalendar();
      return;
    }
    
    if (!this.dailyProblems) {
      modalBody.innerHTML = UIRenderer.renderLoadingState();
      return;
    }

    if (this.dailyProblems.error) {
      modalBody.innerHTML = UIRenderer.renderErrorState(this.dailyProblems.error);
      return;
    }

    // Check if problems are solved by checking submissions
    const today = this.streakManager.getUTCDateString();
    const isToday = this.dailyProblems.date === today;
    
    if (isToday) {
      await this.checkTodaysSolutions();
    }

    const { userRating, isLoggedIn, ratingBased, random } = this.dailyProblems;
    const ratingClass = UIRenderer.getRatingClass(userRating);
    const rankTitle = UIRenderer.getRankTitle(userRating);
    
    const todayCompleted = this.streakManager.isTodayCompleted();
    
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
        
        ${this.streakManager.streakData ? `
          <div class="cf-streak-section">
            <div class="cf-streak-item">
              <div class="cf-streak-icon">🔥</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${this.streakManager.streakData.personalizedStreak}</div>
                <div class="cf-streak-label">Personalized</div>
                <div class="cf-streak-best">Best: ${this.streakManager.streakData.maxPersonalizedStreak}</div>
              </div>
            </div>
            <div class="cf-streak-item">
              <div class="cf-streak-icon" style="cursor: pointer;" onclick="window.cfDaily.toggleCalendarView()">📅</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number" style="cursor: pointer;" onclick="window.cfDaily.toggleCalendarView()">${todayCompleted.any ? '✓' : '○'}</div>
                <div class="cf-streak-label" style="cursor: pointer;" onclick="window.cfDaily.toggleCalendarView()">Calendar</div>
                <div class="cf-streak-best" style="cursor: pointer;" onclick="window.cfDaily.toggleCalendarView()">View History</div>
              </div>
            </div>
            <div class="cf-streak-item">
              <div class="cf-streak-icon">🚀</div>
              <div class="cf-streak-info">
                <div class="cf-streak-number">${this.streakManager.streakData.randomStreak}</div>
                <div class="cf-streak-label">Random</div>
                <div class="cf-streak-best">Best: ${this.streakManager.streakData.maxRandomStreak}</div>
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
          ${UIRenderer.renderProblemCard(ratingBased, 'rating', todayCompleted.personalized)}
        </div>
        
        <div class="cf-problem-section">
          <h4>Daily Random Problem</h4>
          <p class="cf-section-desc">Universal challenge for all users (same globally)</p>
          ${UIRenderer.renderProblemCard(random, 'random', todayCompleted.random)}
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

    if (isToday) {
      this.startCountdown();
    }
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

    const timeLeft = this.streakManager.getTimeUntilNextUTCDay();

    countdownElement.innerHTML = `
      <div class="cf-countdown-display">
        <span class="cf-countdown-icon">⏰</span>
        <span class="cf-countdown-label">Next problems in:</span>
        <span class="cf-countdown-time">${timeLeft.hours}:${timeLeft.minutes}:${timeLeft.seconds}</span>
      </div>
    `;
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