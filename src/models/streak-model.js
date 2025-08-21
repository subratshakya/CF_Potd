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
    let isConsecutive = false;
    
    if (this.streakData.personalizedStreak === 0) {
      isConsecutive = true;
    } else if (this.streakData.lastPersonalizedDate) {
      const lastDate = new Date(this.streakData.lastPersonalizedDate + 'T00:00:00.000Z');
      const currentDate = new Date(dateString + 'T00:00:00.000Z');
      const daysDifference = DateUtils.getDaysDifference(lastDate, currentDate);
      isConsecutive = daysDifference === 1;
    }
    
    if (isConsecutive) {
      this.streakData.personalizedStreak += 1;
    } else {
      this.streakData.personalizedStreak = 1;
    }
    
    this.streakData.lastPersonalizedDate = dateString;
    this.streakData.maxPersonalizedStreak = Math.max(
      this.streakData.maxPersonalizedStreak, 
      this.streakData.personalizedStreak
    );

    logger.debug('StreakModel.updatePersonalizedStreak', 'Updated personalized streak', {
      current: this.streakData.personalizedStreak,
      max: this.streakData.maxPersonalizedStreak
    });
  }

  /**
   * Update random problem streak
   * @param {string} dateString - Current date string
   */
  updateRandomStreak(dateString) {
    let isConsecutive = false;
    
    if (this.streakData.randomStreak === 0) {
      isConsecutive = true;
    } else if (this.streakData.lastRandomDate) {
      const lastDate = new Date(this.streakData.lastRandomDate + 'T00:00:00.000Z');
      const currentDate = new Date(dateString + 'T00:00:00.000Z');
      const daysDifference = DateUtils.getDaysDifference(lastDate, currentDate);
      isConsecutive = daysDifference === 1;
    }
    
    if (isConsecutive) {
      this.streakData.randomStreak += 1;
    } else {
      this.streakData.randomStreak = 1;
    }
    
    this.streakData.lastRandomDate = dateString;
    this.streakData.maxRandomStreak = Math.max(
      this.streakData.maxRandomStreak, 
      this.streakData.randomStreak
    );

    logger.debug('StreakModel.updateRandomStreak', 'Updated random streak', {
      current: this.streakData.randomStreak,
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
   * Validate and fix streak consistency
   * @returns {Promise<boolean>} Whether fixes were applied
   */
  async validateAndFixStreaks() {
    try {
      logger.info('StreakModel.validateAndFixStreaks', 'Validating streak consistency');
      
      let hasChanges = false;
      const completedDays = Object.keys(this.streakData.completedDays).sort();
      
      // Validate personalized streak
      const personalizedDays = completedDays.filter(date => 
        this.streakData.completedDays[date].solvedPersonalized
      );
      
      if (personalizedDays.length > 0) {
        const correctPersonalizedStreak = this.calculateCorrectStreak(personalizedDays);
        if (correctPersonalizedStreak !== this.streakData.personalizedStreak) {
          this.streakData.personalizedStreak = correctPersonalizedStreak;
          hasChanges = true;
        }
      }
      
      // Validate random streak
      const randomDays = completedDays.filter(date => 
        this.streakData.completedDays[date].solvedRandom
      );
      
      if (randomDays.length > 0) {
        const correctRandomStreak = this.calculateCorrectStreak(randomDays);
        if (correctRandomStreak !== this.streakData.randomStreak) {
          this.streakData.randomStreak = correctRandomStreak;
          hasChanges = true;
        }
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

  /**
   * Calculate correct streak from consecutive days
   * @param {Array} sortedDays - Sorted array of date strings
   * @returns {number} Correct streak count
   */
  calculateCorrectStreak(sortedDays) {
    if (sortedDays.length === 0) return 0;
    
    const today = DateUtils.getUTCDateString();
    const todayIndex = sortedDays.indexOf(today);
    
    // If today is not in the list, streak is 0
    if (todayIndex === -1) return 0;
    
    let streak = 1;
    
    // Count backwards from today
    for (let i = todayIndex - 1; i >= 0; i--) {
      const currentDate = new Date(sortedDays[i + 1] + 'T00:00:00.000Z');
      const previousDate = new Date(sortedDays[i] + 'T00:00:00.000Z');
      const daysDiff = DateUtils.getDaysDifference(previousDate, currentDate);
      
      if (daysDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
}