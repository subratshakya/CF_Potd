// Background service for Chrome extension

import { CONFIG } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { DateUtils } from '../utils/date-utils.js';
import { StorageService } from '../services/storage-service.js';
import { apiService } from '../services/api-service.js';
import { StreakModel } from '../models/streak-model.js';

export class BackgroundService {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup Chrome extension event listeners
   */
  setupEventListeners() {
    // Extension installation
    chrome.runtime.onInstalled.addListener(() => {
      logger.info('BackgroundService', 'Extension installed');
      this.setupPeriodicStreakChecks();
    });

    // Extension startup
    chrome.runtime.onStartup.addListener(() => {
      logger.info('BackgroundService', 'Extension started');
      this.cleanupOldCache();
      this.setupPeriodicStreakChecks();
    });

    // Alarm events
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'streak-check-midnight' || alarm.name === 'streak-check-noon') {
        logger.info('BackgroundService', `Streak check triggered: ${alarm.name}`);
        await this.performStreakCheck();
      }
    });

    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('codeforces.com')) {
        logger.debug('BackgroundService', 'Codeforces page loaded');
      }
    });

    // Message handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  /**
   * Setup periodic streak checks
   */
  setupPeriodicStreakChecks() {
    try {
      // Clear existing alarms
      chrome.alarms.clearAll();
      
      // Create alarms for streak checking
      chrome.alarms.create('streak-check-midnight', {
        when: DateUtils.getNextAlarmTime(0, 0), // 12:00 AM UTC
        periodInMinutes: 24 * 60 // Every 24 hours
      });
      
      chrome.alarms.create('streak-check-noon', {
        when: DateUtils.getNextAlarmTime(12, 0), // 12:00 PM UTC
        periodInMinutes: 24 * 60 // Every 24 hours
      });
      
      logger.info('BackgroundService.setupPeriodicStreakChecks', 'Periodic streak checks scheduled');
    } catch (error) {
      logger.error('BackgroundService.setupPeriodicStreakChecks', 'Error setting up alarms', error);
    }
  }

  /**
   * Perform streak validation for all users
   */
  async performStreakCheck() {
    try {
      logger.info('BackgroundService.performStreakCheck', 'Starting streak check for all users');
      
      const allKeys = await StorageService.getAllKeys();
      const streakKeys = allKeys.filter(key => key.startsWith(CONFIG.CACHE.KEYS.STREAK_PREFIX));
      
      for (const streakKey of streakKeys) {
        const username = streakKey.replace(CONFIG.CACHE.KEYS.STREAK_PREFIX, '');
        if (username === 'guest') continue; // Skip guest users
        
        logger.debug('BackgroundService.performStreakCheck', `Checking streak for user: ${username}`);
        await this.checkUserStreak(username);
      }
      
      logger.info('BackgroundService.performStreakCheck', 'Completed streak check for all users');
    } catch (error) {
      logger.error('BackgroundService.performStreakCheck', 'Error during streak check', error);
    }
  }

  /**
   * Check individual user's streak
   * @param {string} username - Username to check
   */
  async checkUserStreak(username) {
    try {
      const streakModel = new StreakModel(username);
      await streakModel.load();
      
      const today = DateUtils.getUTCDateString();
      
      // If today is already marked as completed, skip
      if (streakModel.streakData.completedDays[today]) {
        logger.debug('BackgroundService.checkUserStreak', `${username}: Today already completed`);
        // Still validate streaks to ensure accuracy
        await streakModel.validateAndFixStreaks();
        return;
      }
      
      // Get today's problems
      const todayProblems = await this.getTodayProblems(username);
      if (!todayProblems) {
        logger.debug('BackgroundService.checkUserStreak', `${username}: No cached problems found`);
        // Check if streak should be reset due to missed days
        await this.checkStreakReset(streakModel);
        return;
      }
      
      // Check submissions
      const submissions = await apiService.fetchUserSubmissions(username, 50);
      const solvedProblems = [];
      let solvedPersonalized = false;
      let solvedRandom = false;
      
      for (const submission of submissions) {
        const submissionTime = new Date(submission.creationTimeSeconds * 1000);
        const submissionDate = DateUtils.getUTCDateString(submissionTime);
        
        if (submissionDate === today && submission.verdict === 'OK') {
          const problemId = `${submission.problem.contestId}${submission.problem.index}`;
          
          if (todayProblems.ratingBased && 
              `${todayProblems.ratingBased.contestId}${todayProblems.ratingBased.index}` === problemId) {
            solvedPersonalized = true;
            solvedProblems.push(problemId);
          }
          
          if (todayProblems.random && 
              `${todayProblems.random.contestId}${todayProblems.random.index}` === problemId) {
            solvedRandom = true;
            solvedProblems.push(problemId);
          }
        }
      }
      
      // Update streak if problems were solved
      if (solvedProblems.length > 0) {
        logger.info('BackgroundService.checkUserStreak', `${username}: Solved problems today`, solvedProblems);
        await streakModel.markDayCompleted(today, solvedProblems, solvedPersonalized, solvedRandom);
      } else {
        logger.debug('BackgroundService.checkUserStreak', `${username}: No problems solved today`);
        // Check if streak should be reset
        await this.checkStreakReset(streakModel);
      }
      
      // Always validate streaks for accuracy
      await streakModel.validateAndFixStreaks();
      
    } catch (error) {
      logger.error('BackgroundService.checkUserStreak', `Error checking streak for ${username}`, error);
    }
  }

  /**
   * Check if streaks should be reset due to missed days (with server validation)
   * @param {StreakModel} streakModel - Streak model instance
   */
  async checkStreakResetWithServerValidation(streakModel) {
    try {
      const today = DateUtils.getUTCDateString();
      const yesterday = DateUtils.getUTCDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      const todayData = streakModel.streakData.completedDays[today];
      const yesterdayData = streakModel.streakData.completedDays[yesterday];
      
      // Check if we have recent server data
      const daysSinceLastCheck = streakModel.getDaysSinceLastSuccessfulCheck();
      const hasRecentServerData = daysSinceLastCheck <= 1;
      
      if (!hasRecentServerData) {
        logger.info('BackgroundService.checkStreakResetWithServerValidation', 
          'Server data too old, not resetting streaks', { daysSinceLastCheck });
        return;
      }
      
      let hasChanges = false;
      
      // Check personalized streak reset
      const solvedPersonalizedToday = todayData && todayData.solvedPersonalized;
      const solvedPersonalizedYesterday = yesterdayData && yesterdayData.solvedPersonalized;
      
      if (!solvedPersonalizedToday && !solvedPersonalizedYesterday && streakModel.streakData.personalizedStreak > 0) {
        logger.info('BackgroundService.checkStreakResetWithServerValidation', 
          'Resetting personalized streak due to confirmed missed days');
        streakModel.streakData.personalizedStreak = 0;
        streakModel.streakData.lastPersonalizedDate = null;
        hasChanges = true;
      }
      
      // Check random streak reset
      const solvedRandomToday = todayData && todayData.solvedRandom;
      const solvedRandomYesterday = yesterdayData && yesterdayData.solvedRandom;
      
      if (!solvedRandomToday && !solvedRandomYesterday && streakModel.streakData.randomStreak > 0) {
        logger.info('BackgroundService.checkStreakResetWithServerValidation', 
          'Resetting random streak due to confirmed missed days');
        streakModel.streakData.randomStreak = 0;
        streakModel.streakData.lastRandomDate = null;
        hasChanges = true;
      }
      
      if (hasChanges) {
        await streakModel.save();
      }
      
    } catch (error) {
      logger.error('BackgroundService.checkStreakResetWithServerValidation', 'Error checking streak reset', error);
    }
  }

  /**
   * Get today's problems for a user
   * @param {string} username - Username
   * @returns {Promise<Object|null>} Today's problems or null
   */
  async getTodayProblems(username) {
    try {
      const today = DateUtils.getUTCDateString();
      
      const globalCacheKey = `${CONFIG.CACHE.KEYS.GLOBAL_PREFIX}${today}`;
      const userCacheKey = `${CONFIG.CACHE.KEYS.USER_PREFIX}${username}-${today}`;
      
      const globalCache = await StorageService.get(globalCacheKey);
      const userCache = await StorageService.get(userCacheKey);
      
      if (globalCache && userCache) {
        return {
          ratingBased: userCache.ratingProblem,
          random: globalCache.randomProblem
        };
      }
      
      return null;
    } catch (error) {
      logger.error('BackgroundService.getTodayProblems', 'Error getting today\'s problems', error);
      return null;
    }
  }

  /**
   * Clean up old cached data
   */
  async cleanupOldCache() {
    try {
      logger.info('BackgroundService.cleanupOldCache', 'Cleaning up old cache');
      await StorageService.clearOldCache(CONFIG.CACHE.DURATION_HOURS);
    } catch (error) {
      logger.error('BackgroundService.cleanupOldCache', 'Error cleaning up cache', error);
    }
  }

  /**
   * Handle messages from content script
   * @param {Object} message - Message object
   * @param {Object} sender - Sender information
   * @param {Function} sendResponse - Response function
   */
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getCachedProblems':
        StorageService.get('cf-daily-cache').then(sendResponse);
        break;
        
      case 'setCachedProblems':
        StorageService.set('cf-daily-cache', message.data).then(() => {
          sendResponse({ success: true });
        });
        break;
        
      default:
        logger.warn('BackgroundService.handleMessage', `Unknown message action: ${message.action}`);
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize background service
new BackgroundService();