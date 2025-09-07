// UI component rendering functions

import { CONFIG, RATING_CLASSES } from '../config/constants.js';
import { DateUtils } from '../utils/date-utils.js';

export class UIComponents {
  /**
   * Get rating class for styling
   * @param {number} rating - User rating
   * @returns {string} CSS class name
   */
  static getRatingClass(rating) {
    for (const [key, config] of Object.entries(RATING_CLASSES)) {
      if (rating >= config.min && rating <= config.max) {
        return config.class;
      }
    }
    return RATING_CLASSES.NEWBIE.class;
  }

  /**
   * Get rank title from rating
   * @param {number} rating - User rating
   * @returns {string} Rank title
   */
  static getRankTitle(rating) {
    for (const [key, config] of Object.entries(RATING_CLASSES)) {
      if (rating >= config.min && rating <= config.max) {
        return config.title;
      }
    }
    return RATING_CLASSES.NEWBIE.title;
  }

  /**
   * Render problem card component
   * @param {Object} problem - Problem object
   * @param {string} type - Problem type ('rating' or 'random')
   * @param {boolean} isSolved - Whether problem is solved
   * @returns {string} HTML string
   */
  static renderProblemCard(problem, type, isSolved = false) {
    if (!problem) {
      return `
        <div class="cf-problem-card cf-problem-unavailable">
          <p>No suitable problem found.</p>
        </div>
      `;
    }

    const ratingClass = `cf-rating-${Math.floor(problem.rating / 100) * 100}`;
    const problemUrl = `${CONFIG.API.BASE_URL.replace('/api', '')}/problemset/problem/${problem.contestId}/${problem.index}`;
    
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

  /**
   * Render loading state component
   * @returns {string} HTML string
   */
  static renderLoadingState() {
    return `
      <div class="cf-loading">
        <div class="cf-spinner"></div>
        <p>Loading problems...</p>
      </div>
    `;
  }

  /**
   * Render error state component
   * @param {string} error - Error message
   * @returns {string} HTML string
   */
  static renderErrorState(error) {
    return `
      <div class="cf-error">
        <p>${error}</p>
        <button onclick="location.reload()" class="cf-retry-btn">Retry</button>
      </div>
    `;
  }

  /**
   * Render countdown timer component
   * @param {Object} timeLeft - Time left object
   * @returns {string} HTML string
   */
  static renderCountdownTimer(timeLeft) {
    return `
      <div class="cf-countdown-section">
        <div class="cf-countdown-timer">
          <div class="cf-countdown-display">
            <span class="cf-countdown-icon">⏰</span>
            <span class="cf-countdown-label">Next problems in:</span>
            <span class="cf-countdown-time">${timeLeft.hours}:${timeLeft.minutes}:${timeLeft.seconds}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render streak section component
   * @param {Object} streakData - Streak data object
   * @param {Object} todayCompleted - Today's completion status
   * @param {boolean} serverDataStale - Whether server data is stale
   * @returns {string} HTML string
   */
  static renderStreakSection(streakData, todayCompleted, serverDataStale = false) {
    if (!streakData) return '';

    const staleWarning = serverDataStale ? 
      '<div style="font-size: 10px; color: #ff6b35; text-align: center; margin-bottom: 8px;">⚠️ Server data stale - showing last known streaks</div>' : '';

    return `
      <div class="cf-streak-section">
        ${staleWarning}
        <div class="cf-streak-item">
          <div class="cf-streak-icon">🔥</div>
          <div class="cf-streak-info">
            <div class="cf-streak-number">${streakData.personalizedStreak}</div>
            <div class="cf-streak-label">Personalized</div>
            <div class="cf-streak-best">Best: ${streakData.maxPersonalizedStreak}</div>
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
            <div class="cf-streak-number">${streakData.randomStreak}</div>
            <div class="cf-streak-label">Random</div>
            <div class="cf-streak-best">Best: ${streakData.maxRandomStreak}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render user info section
   * @param {string} username - Username
   * @param {number} userRating - User rating
   * @param {boolean} userVerified - User verification status
   * @param {boolean} isLoggedIn - Login status
   * @param {boolean} isToday - Whether showing today's problems
   * @param {string} dateString - Date string for display
   * @returns {string} HTML string
   */
  static renderUserInfo(username, userRating, userVerified, isLoggedIn, isToday, dateString) {
    const ratingClass = this.getRatingClass(userRating);
    const rankTitle = this.getRankTitle(userRating);

    return `
      <div class="cf-user-info">
        ${isLoggedIn ? 
          `<h3><span class="cf-username cf-username-${ratingClass}">${username}</span> ${userVerified ? '✓' : '⚠️'}</h3>
           <p>${rankTitle} • Rating: <span class="cf-rating">${userRating}</span></p>
           ${!userVerified ? '<p class="cf-warning">⚠️ User verification failed - data may be inaccurate</p>' : ''}` :
          `<h3>Guest User</h3>
           <p>Log in to get personalized problems and automatic tracking</p>`
        }
        ${!isToday ? `<p class="cf-date-info">Problems for ${DateUtils.formatDateForDisplay(new Date(dateString))}</p>` : ''}
      </div>
    `;
  }
}