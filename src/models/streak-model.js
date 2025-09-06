// Streak data model and management

import { CONFIG } from '../config/constants.js';
import { StorageService } from '../services/storage-service.js';
import { DateUtils } from '../utils/date-utils.js';
import { logger } from '../utils/logger.js';

export class StreakModel {
  constructor(username = null) {
    this.username = username;
    this.streakData = null;
    this.storageKey = username 
      ? `${CONFIG.CACHE.KEYS.STREAK_PREFIX}${username}` 
      : `${CONFIG.CACHE.KEYS.STREAK_PREFIX}guest`;
  }

  /**
   * Initialize default streak data
   * @returns {Object} Default streak data structure
   */
  getDefaultStreakData() {
    return {
      personalizedStreak: 0,
      randomStreak: 0,
      maxPersonalizedStreak: 0,
      maxRandomStreak: 0,
      completedDays: {},
      lastPersonalizedDate: null,
      lastRandomDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Load streak data from storage
   * @returns {Promise<boolean>} Success status
   */
  async load() {
    try {
      logger.info('StreakModel.load', `Loading streak data for ${this.username || 'guest'}`);
      
      const data = await StorageService.get(this.storageKey);
      this.streakData = data || this.getDefaultStreakData();
      
      logger.debug('StreakModel.load', 'Loaded streak data', this.streakData);
      return true;
    } catch (error) {
      logger.error('StreakModel.load', 'Error loading streak data', error);
      this.streakData = this.getDefaultStreakData();
      return false;
    }
  }

  /**
   * Save streak data to storage
   * @returns {Promise<boolean>} Success status
   */
  async save() {
    try {
      if (!this.streakData) {
        logger.warn('StreakModel.save', 'No streak data to save');
        return false;
      }

      this.streakData.updatedAt = Date.now();
      await StorageService.set(this.storageKey, this.streakData);
      
      logger.debug('StreakModel.save', 'Saved streak data', this.streakData);
      return true;
    } catch (error) {
      logger.error('StreakModel.save', 'Error saving streak data', error);
      return false;
    }
  }

  /**
   * Mark a day as completed with solved problems
   * @param {string} dateString - Date string (YYYY-MM-DD)
   * @param {Array} solvedProblems - Array of solved problem IDs
   * @param {boolean} solvedPersonalized - Whether personalized problem was solved
   * @param {boolean} solvedRandom - Whether random problem was solved
   * @returns {Promise<boolean>} Success status
   */
  async markDayCompleted(dateString, solvedProblems = [], solvedPersonalized = false, solvedRandom = false) {
    try {
      logger.info('StreakModel.markDayCompleted', `Marking ${dateString} as completed`, {
        solvedProblems,
        solvedPersonalized,
        solvedRandom
      });

      // Check if already marked to avoid duplicate processing
      if (this.streakData.completedDays[dateString]) {
        logger.debug('StreakModel.markDayCompleted', `Day ${dateString} already marked as completed`);
        return true;
      }

      // Mark day as completed
      this.streakData.completedDays[dateString] = {
        solved: true,
        timestamp: Date.now(),
        problems: solvedProblems,
        solvedPersonalized,
        solvedRandom
      };

      // Update personalized streak
      if (solvedPersonalized) {
        this.updatePersonalizedStreak(dateString);
      }

      // Update random streak
      if (solvedRandom) {
        this.updateRandomStreak(dateString);
      }

      await this.save();
      return true;
    } catch (error) {
      logger.error('StreakModel.markDayCompleted', 'Error marking day completed', error);
      return false;
    }
  }

  /**
   * Update personalized problem streak
   * @param {string} dateString - Current date string
   */
  updatePersonalizedStreak(dateString) {
    // Calculate streak based on consecutive days from completion history
    const streak = this.calculateCurrentStreak('personalized', dateString);
    this.streakData.personalizedStreak = streak;
    
    this.streakData.lastPersonalizedDate = dateString;
    this.streakData.maxPersonalizedStreak = Math.max(
      this.streakData.maxPersonalizedStreak, 
      streak
    );

    logger.debug('StreakModel.updatePersonalizedStreak', 'Updated personalized streak', {
      current: streak,
      max: this.streakData.maxPersonalizedStreak
    });
  }

  /**
   * Update random problem streak
   * @param {string} dateString - Current date string
   */
  updateRandomStreak(dateString) {
    // Calculate streak based on consecutive days from completion history
    const streak = this.calculateCurrentStreak('random', dateString);
    this.streakData.randomStreak = streak;
    
    this.streakData.lastRandomDate = dateString;
    this.streakData.maxRandomStreak = Math.max(
      this.streakData.maxRandomStreak, 
      streak
    );

    logger.debug('StreakModel.updateRandomStreak', 'Updated random streak', {
      current: streak,
      max: this.streakData.maxRandomStreak
    });
  }

  /**
   * Check if today is completed
   * @returns {Object} Today's completion status
   */
  isTodayCompleted() {
    const today = DateUtils.getUTCDateString();
    const todayData = this.streakData.completedDays[today];
    
    return {
      any: !!todayData,
      personalized: !!(todayData && todayData.solvedPersonalized),
      random: !!(todayData && todayData.solvedRandom)
    };
  }

  /**
   * Check if streak should be reset (missed yesterday)
   * @param {string} type - 'personalized' or 'random'
   * @returns {boolean} Whether streak should be reset
   */
  shouldResetStreak(type) {
    const today = DateUtils.getUTCDateString();
    const yesterday = DateUtils.getUTCDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    const todayData = this.streakData.completedDays[today];
    const yesterdayData = this.streakData.completedDays[yesterday];
    
    const solvedToday = todayData && (type === 'personalized' ? todayData.solvedPersonalized : todayData.solvedRandom);
    const solvedYesterday = yesterdayData && (type === 'personalized' ? yesterdayData.solvedPersonalized : yesterdayData.solvedRandom);
    
    // If didn't solve today and didn't solve yesterday, reset streak
    return !solvedToday && !solvedYesterday;
  }

  /**
   * Get current streak status for display
   * @returns {Object} Streak status object
   */
  getStreakStatus() {
    const today = DateUtils.getUTCDateString();
    
    // Recalculate streaks based on actual completion history
    const personalizedStreak = this.calculateCurrentStreak('personalized', today);
    const randomStreak = this.calculateCurrentStreak('random', today);
    
    // Update stored values if they're incorrect
    if (personalizedStreak !== this.streakData.personalizedStreak) {
      this.streakData.personalizedStreak = personalizedStreak;
    }
    if (randomStreak !== this.streakData.randomStreak) {
      this.streakData.randomStreak = randomStreak;
    }
    
    return {
      personalizedStreak,
      randomStreak,
      maxPersonalizedStreak: this.streakData.maxPersonalizedStreak,
      maxRandomStreak: this.streakData.maxRandomStreak,
      shouldResetPersonalized: this.shouldResetStreak('personalized'),
      shouldResetRandom: this.shouldResetStreak('random')
    };
  }

  /**
   * Get time until next UTC day
   * @returns {Object} Time remaining object
   */
  getTimeUntilNextUTCDay() {
    return DateUtils.getTimeUntilNextUTCDay();
  }

  /**
   * Get UTC date string
   * @param {Date} date - Date object
   * @returns {string} UTC date string
   */
  getUTCDateString(date = new Date()) {
    return DateUtils.getUTCDateString(date);
  }

  /**
   * Calculate current streak for a specific type (LeetCode style)
   * @param {string} type - 'personalized' or 'random'
   * @param {string} currentDate - Current date string
   * @returns {number} Current streak count
   */
  calculateCurrentStreak(type, currentDate) {
    try {
      const completedDays = Object.keys(this.streakData.completedDays).sort();
      const relevantDays = completedDays.filter(date => {
        const dayData = this.streakData.completedDays[date];
        return type === 'personalized' ? dayData.solvedPersonalized : dayData.solvedRandom;
      });

      if (relevantDays.length === 0) return 0;

      // Start from current date and count backwards
      let streak = 0;
      let checkDate = new Date(currentDate + 'T00:00:00.000Z');

      // Count consecutive days backwards from current date
      while (true) {
        const checkDateStr = DateUtils.getUTCDateString(checkDate);
        
        if (relevantDays.includes(checkDateStr)) {
          streak++;
          // Move to previous day
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      logger.error('StreakModel.calculateCurrentStreak', 'Error calculating streak', error);
      return 0;
    }
  }

  /**
   * Validate and recalculate all streaks (LeetCode style)
   * @returns {Promise<boolean>} Whether fixes were applied
   */
  async validateAndFixStreaks() {
    try {
      logger.info('StreakModel.validateAndFixStreaks', 'Validating streak consistency');
      
      let hasChanges = false;
      const today = DateUtils.getUTCDateString();
      
      // Recalculate personalized streak
      const correctPersonalizedStreak = this.calculateCurrentStreak('personalized', today);
      if (correctPersonalizedStreak !== this.streakData.personalizedStreak) {
        this.streakData.personalizedStreak = correctPersonalizedStreak;
        hasChanges = true;
      }
      
      // Recalculate random streak
      const correctRandomStreak = this.calculateCurrentStreak('random', today);
      if (correctRandomStreak !== this.streakData.randomStreak) {
        this.streakData.randomStreak = correctRandomStreak;
        hasChanges = true;
      }
      
      if (hasChanges) {
        await this.save();
        logger.info('StreakModel.validateAndFixStreaks', 'Applied streak corrections');
      }
      
      return hasChanges;
    } catch (error) {
      logger.error('StreakModel.validateAndFixStreaks', 'Error validating streaks', error);
      return false;
    }
  }
}