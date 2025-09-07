// Main controller for Codeforces Daily Problems Extension

import { CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { DateUtils } from '../utils/date-utils.js';
import { StorageService } from '../services/storage-service.js';
import { ProblemService } from '../services/problem-service.js';
import { UserDetectionService } from '../services/user-detection-service.js';
import { StreakModel } from '../models/streak-model.js';
import { UIComponents } from '../components/ui-components.js';
import { CalendarComponent } from '../components/calendar-component.js';

export class MainController {
  constructor() {
    this.currentUser = null;
    this.dailyProblems = null;
    this.isModalOpen = false;
    this.streakModel = null;
    this.currentUserRating = null;
    this.countdownInterval = null;
    this.userVerified = false;
    this.isCalendarView = false;
    this.selectedDate = null;
    this.calendarDate = new Date();
    
    this.init();
  }

  /**
   * Initialize the extension
   */
  async init() {
    try {
      logger.info('MainController.init', 'Initializing extension');
      
      // Wait for page to load
      setTimeout(async () => {
        await this.detectUser();
      }, 2000);
    } catch (error) {
      logger.error('MainController.init', 'Error during initialization', error);
    }
  }

  /**
   * Detect and verify current user
   */
  async detectUser() {
    try {
      logger.info('MainController.detectUser', 'Starting user detection');
      
      const detectedUsername = await UserDetectionService.detectUser();

      // Clear cache if user changed
      const previousUser = await StorageService.get(CONFIG.CACHE.KEYS.CURRENT_USER);
      if (previousUser !== detectedUsername) {
        logger.info('MainController.detectUser', `User changed from ${previousUser} to ${detectedUsername}`);
        await StorageService.clearUserCache();
        await StorageService.set(CONFIG.CACHE.KEYS.CURRENT_USER, detectedUsername);
      }

      // Handle guest user
      if (!detectedUsername) {
        logger.info('MainController.detectUser', 'No user detected - treating as guest');
        await this.setupGuestUser();
        return;
      }

      // Verify detected user
      const userInfo = await UserDetectionService.verifyAndFetchUserInfo(detectedUsername);
      
      if (userInfo) {
        await this.setupVerifiedUser(detectedUsername, userInfo);
      } else {
        logger.warn('MainController.detectUser', 'User verification failed - treating as guest');
        await this.setupGuestUser();
      }

    } catch (error) {
      logger.error('MainController.detectUser', 'Error during user detection', error);
      await this.setupGuestUser();
    }
  }

  /**
   * Setup for guest user
   */
  async setupGuestUser() {
    this.currentUser = null;
    this.currentUserRating = null;
    this.userVerified = true;
    this.streakModel = new StreakModel(null);
    
    await this.completeSetup();
  }

  /**
   * Setup for verified user
   * @param {string} username - Username
   * @param {Object} userInfo - User information from API
   */
  async setupVerifiedUser(username, userInfo) {
    this.currentUser = username;
    this.currentUserRating = userInfo.rating || CONFIG.PROBLEMS.DEFAULT_USER_RATING;
    this.userVerified = true;
    this.streakModel = new StreakModel(username);
    
    logger.info('MainController.setupVerifiedUser', `User verified: ${username}, Rating: ${this.currentUserRating}`);
    
    await this.completeSetup();
  }

  /**
   * Complete extension setup
   */
  async completeSetup() {
    try {
      // Load streak data
      await this.streakModel.load();
      
      // Create UI elements
      this.createFloatingButton();
      this.createModal();
      
      // Load daily problems
      await this.loadDailyProblems();
      
      logger.info('MainController.completeSetup', 'Extension setup completed');
    } catch (error) {
      logger.error('MainController.completeSetup', 'Error completing setup', error);
    }
  }

  /**
   * Create floating action button
   */
  createFloatingButton() {
    const button = document.createElement('div');
    button.id = CONFIG.UI.BUTTON_ID;
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
    
    logger.debug('MainController.createFloatingButton', 'Floating button created');
  }

  /**
   * Create modal dialog
   */
  createModal() {
    const modal = document.createElement('div');
    modal.id = CONFIG.UI.MODAL_ID;
    modal.innerHTML = `
      <div class="cf-modal-overlay">
        <div class="cf-modal-content">
          <div class="cf-modal-header">
            <h2>Daily Problems</h2>
            <button class="cf-modal-close" id="cf-modal-close">×</button>
          </div>
          <div class="cf-modal-body" id="cf-modal-body">
            ${UIComponents.renderLoadingState()}
          </div>
        </div>
      </div>
    `;

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.cf-modal-overlay')) {
        this.closeModal();
      }
    });

    modal.querySelector('#cf-modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    document.body.appendChild(modal);
    
    logger.debug('MainController.createModal', 'Modal created');
  }

  /**
   * Load daily problems for a specific date
   * @param {Date} date - Date to load problems for
   */
  async loadDailyProblems(date = new Date()) {
    try {
      logger.info('MainController.loadDailyProblems', `Loading problems for ${DateUtils.getUTCDateString(date)}`);
      
      this.dailyProblems = await ProblemService.loadDailyProblems(
        this.currentUser, 
        this.currentUserRating, 
        this.userVerified, 
        date
      );
      
      // Check solutions for today's problems
      if (DateUtils.getUTCDateString(date) === DateUtils.getUTCDateString()) {
        await this.checkTodaysSolutions();
      }
      
    } catch (error) {
      logger.error('MainController.loadDailyProblems', 'Error loading daily problems', error);
      this.dailyProblems = { error: 'Failed to load problems. Please try again later.' };
    }
  }

  /**
   * Check if user solved today's problems
   */
  async checkTodaysSolutions() {
    try {
      await ProblemService.checkTodaysSolutions(
        this.currentUser, 
        this.userVerified, 
        this.dailyProblems, 
        this.streakModel
      );
    } catch (error) {
      logger.error('MainController.checkTodaysSolutions', 'Error checking solutions', error);
    }
  }

  /**
   * Open modal dialog
   */
  openModal() {
    const modal = document.getElementById(CONFIG.UI.MODAL_ID);
    modal.style.display = 'flex';
    this.isModalOpen = true;
    
    setTimeout(() => {
      modal.classList.add('cf-modal-open');
    }, 10);

    this.displayProblems();
    logger.debug('MainController.openModal', 'Modal opened');
  }

  /**
   * Close modal dialog
   */
  closeModal() {
    const modal = document.getElementById(CONFIG.UI.MODAL_ID);
    modal.classList.remove('cf-modal-open');
    
    setTimeout(() => {
      modal.style.display = 'none';
      this.isModalOpen = false;
    }, CONFIG.UI.ANIMATION_DURATION);

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    logger.debug('MainController.closeModal', 'Modal closed');
  }

  /**
   * Toggle calendar view
   */
  toggleCalendarView() {
    this.isCalendarView = !this.isCalendarView;
    if (this.isCalendarView) {
      this.calendarDate = new Date();
    }
    this.displayProblems();
    
    logger.debug('MainController.toggleCalendarView', `Calendar view: ${this.isCalendarView}`);
  }

  /**
   * Change calendar month
   * @param {number} direction - Direction to change (-1 or 1)
   */
  changeCalendarMonth(direction) {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + direction);
    this.displayProblems();
    
    logger.debug('MainController.changeCalendarMonth', `Changed month by ${direction}`);
  }

  /**
   * View problems for a specific date
   * @param {string} dateString - Date string (YYYY-MM-DD)
   */
  async viewDateProblems(dateString) {
    this.selectedDate = dateString;
    this.isCalendarView = false;
    const date = new Date(dateString + 'T00:00:00.000Z');
    await this.loadDailyProblems(date);
    this.displayProblems();
    
    logger.debug('MainController.viewDateProblems', `Viewing problems for ${dateString}`);
  }

  /**
   * Display problems in modal
   */
  async displayProblems() {
    const modalBody = document.getElementById('cf-modal-body');
    
    if (this.isCalendarView) {
      modalBody.innerHTML = CalendarComponent.generateCalendar(this.streakModel, this.calendarDate);
      return;
    }
    
    if (!this.dailyProblems) {
      modalBody.innerHTML = UIComponents.renderLoadingState();
      return;
    }

    if (this.dailyProblems.error) {
      modalBody.innerHTML = UIComponents.renderErrorState(this.dailyProblems.error);
      return;
    }

    // Check if showing today's problems
    const today = DateUtils.getUTCDateString();
    const isToday = this.dailyProblems.date === today;
    
    if (isToday) {
      await this.checkTodaysSolutions();
      // Validate streaks to ensure accuracy
      await this.streakModel.validateAndFixStreaks();
    }

    const { userRating, isLoggedIn, ratingBased, random } = this.dailyProblems;
    const todayCompleted = this.streakModel.isTodayCompleted();
    const streakStatus = this.streakModel.getStreakStatus();
    
    modalBody.innerHTML = this.renderProblemsContent(
      userRating, isLoggedIn, ratingBased, random, 
      isToday, todayCompleted, this.dailyProblems.date, streakStatus
    );

    if (isToday) {
      this.startCountdown();
    }
  }

  /**
   * Render problems content HTML
   * @param {number} userRating - User rating
   * @param {boolean} isLoggedIn - Login status
   * @param {Object} ratingBased - Rating-based problem
   * @param {Object} random - Random problem
   * @param {boolean} isToday - Whether showing today
   * @param {Object} todayCompleted - Today's completion status
   * @param {string} dateString - Date string
   * @param {Object} streakStatus - Current streak status
   * @returns {string} HTML content
   */
  renderProblemsContent(userRating, isLoggedIn, ratingBased, random, isToday, todayCompleted, dateString, streakStatus) {
    return `
      <div class="cf-problems-container">
        ${isToday ? UIComponents.renderCountdownTimer(DateUtils.getTimeUntilNextUTCDay()) : ''}
        
        ${UIComponents.renderStreakSection(
          streakStatus || this.streakModel.streakData, 
          todayCompleted, 
          streakStatus?.serverDataStale
        )}
        
        ${UIComponents.renderUserInfo(
          this.currentUser, userRating, this.userVerified, 
          isLoggedIn, isToday, dateString
        )}
        
        <div class="cf-problem-section">
          <h4>${isLoggedIn ? 'Rating-Based Problem' : 'Beginner Problem'}</h4>
          <p class="cf-section-desc">${isLoggedIn ? 'Problem tailored to your skill level' : 'Problem for rating 1100-1500'}</p>
          ${UIComponents.renderProblemCard(ratingBased, 'rating', todayCompleted.personalized)}
        </div>
        
        <div class="cf-problem-section">
          <h4>Daily Random Problem</h4>
          <p class="cf-section-desc">Universal challenge for all users (same globally)</p>
          ${UIComponents.renderProblemCard(random, 'random', todayCompleted.random)}
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
  }

  /**
   * Start countdown timer
   */
  startCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.updateCountdownDisplay();
    }, 1000);
  }

  /**
   * Update countdown display
   */
  updateCountdownDisplay() {
    const countdownElement = document.querySelector('.cf-countdown-timer');
    if (!countdownElement) return;

    const timeLeft = DateUtils.getTimeUntilNextUTCDay();

    countdownElement.innerHTML = `
      <div class="cf-countdown-display">
        <span class="cf-countdown-icon">⏰</span>
        <span class="cf-countdown-label">Next problems in:</span>
        <span class="cf-countdown-time">${timeLeft.hours}:${timeLeft.minutes}:${timeLeft.seconds}</span>
      </div>
    `;
  }
}