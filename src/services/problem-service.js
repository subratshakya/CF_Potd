// Problem service for fetching and managing daily problems

import { CONFIG, ERROR_MESSAGES } from '../config/constants.js';
import { apiService } from './api-service.js';
import { StorageService } from './storage-service.js';
import { DateUtils } from '../utils/date-utils.js';
import { HashUtils } from '../utils/hash-utils.js';
import { logger } from '../utils/logger.js';

export class ProblemService {
  /**
   * Load daily problems for a user and date
   * @param {string} username - Username (null for guest)
   * @param {number} userRating - User's rating
   * @param {boolean} userVerified - Whether user is verified
   * @param {Date} date - Date for problems
   * @returns {Promise<Object>} Daily problems object
   */
  static async loadDailyProblems(username, userRating, userVerified, date = new Date()) {
    try {
      const dateKey = DateUtils.getUTCDateString(date);
      logger.info('ProblemService.loadDailyProblems', `Loading problems for ${dateKey}`);

      // Check cache first
      const cachedProblems = await this.getCachedProblems(username, userRating, dateKey);
      if (cachedProblems) {
        logger.info('ProblemService.loadDailyProblems', 'Loaded from cache');
        return cachedProblems;
      }

      // Fetch new problems
      return await this.fetchDailyProblems(username, userRating, userVerified, date);
    } catch (error) {
      logger.error('ProblemService.loadDailyProblems', 'Error loading daily problems', error);
      return { error: ERROR_MESSAGES.GENERIC_ERROR };
    }
  }

  /**
   * Get cached problems if available
   * @param {string} username - Username
   * @param {number} userRating - User rating
   * @param {string} dateKey - Date key
   * @returns {Promise<Object|null>} Cached problems or null
   */
  static async getCachedProblems(username, userRating, dateKey) {
    try {
      const globalCacheKey = `${CONFIG.CACHE.KEYS.GLOBAL_PREFIX}${dateKey}`;
      const globalCache = await StorageService.get(globalCacheKey);

      let userCache = null;
      if (username && userRating) {
        const userCacheKey = `${CONFIG.CACHE.KEYS.USER_PREFIX}${username}-${dateKey}`;
        userCache = await StorageService.get(userCacheKey);
      }

      if (globalCache && (!username || userCache)) {
        return {
          userRating: userRating || CONFIG.PROBLEMS.DEFAULT_USER_RATING,
          isLoggedIn: !!(username && userRating),
          ratingBased: userCache?.ratingProblem || null,
          random: globalCache.randomProblem,
          date: dateKey
        };
      }

      return null;
    } catch (error) {
      logger.error('ProblemService.getCachedProblems', 'Error getting cached problems', error);
      return null;
    }
  }

  /**
   * Fetch new daily problems from API
   * @param {string} username - Username
   * @param {number} userRating - User rating
   * @param {boolean} userVerified - User verification status
   * @param {Date} date - Date for problems
   * @returns {Promise<Object>} Daily problems object
   */
  static async fetchDailyProblems(username, userRating, userVerified, date = new Date()) {
    try {
      logger.info('ProblemService.fetchDailyProblems', 'Fetching new problems from API');
      
      const rating = userRating || CONFIG.PROBLEMS.DEFAULT_USER_RATING;
      const dateKey = DateUtils.getUTCDateString(date);

      // Fetch all problems
      const problems = await apiService.fetchProblems();

      // Filter problems for user rating range
      const ratingBasedProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= (rating - CONFIG.PROBLEMS.RATING_BUFFER.LOW) && 
        problem.rating <= (rating + CONFIG.PROBLEMS.RATING_BUFFER.HIGH)
      );

      // Filter problems for random selection
      const allProblems = problems.filter(problem => 
        problem.rating && 
        problem.rating >= CONFIG.PROBLEMS.MIN_RATING && 
        problem.rating <= CONFIG.PROBLEMS.MAX_RATING
      );

      // Select daily problems
      const ratingProblem = HashUtils.selectDailyItem(ratingBasedProblems, dateKey, 'rating');
      const randomProblem = HashUtils.selectDailyItem(allProblems, dateKey, 'random');

      const dailyProblems = {
        userRating: rating,
        isLoggedIn: !!(username && userVerified),
        ratingBased: ratingProblem,
        random: randomProblem,
        date: dateKey
      };

      // Cache the problems
      await this.cacheProblems(username, rating, dateKey, ratingProblem, randomProblem);

      logger.info('ProblemService.fetchDailyProblems', 'Successfully fetched and cached new problems');
      return dailyProblems;

    } catch (error) {
      logger.error('ProblemService.fetchDailyProblems', 'Error fetching daily problems', error);
      return { error: ERROR_MESSAGES.API_ERROR };
    }
  }

  /**
   * Cache problems for future use
   * @param {string} username - Username
   * @param {number} userRating - User rating
   * @param {string} dateKey - Date key
   * @param {Object} ratingProblem - Rating-based problem
   * @param {Object} randomProblem - Random problem
   */
  static async cacheProblems(username, userRating, dateKey, ratingProblem, randomProblem) {
    try {
      // Cache global random problem
      const globalCacheKey = `${CONFIG.CACHE.KEYS.GLOBAL_PREFIX}${dateKey}`;
      await StorageService.set(globalCacheKey, {
        randomProblem: randomProblem,
        cachedAt: Date.now()
      });

      // Cache user-specific rating problem
      if (username && userRating) {
        const userCacheKey = `${CONFIG.CACHE.KEYS.USER_PREFIX}${username}-${dateKey}`;
        await StorageService.set(userCacheKey, {
          ratingProblem: ratingProblem,
          userRating: userRating,
          cachedAt: Date.now()
        });
      }

      logger.debug('ProblemService.cacheProblems', `Cached problems for ${dateKey}`);
    } catch (error) {
      logger.error('ProblemService.cacheProblems', 'Error caching problems', error);
    }
  }

  /**
   * Check if user solved today's problems
   * @param {string} username - Username
   * @param {boolean} userVerified - User verification status
   * @param {Object} dailyProblems - Daily problems object
   * @param {Object} streakManager - Streak manager instance
   * @returns {Promise<boolean>} Whether problems were solved
   */
  static async checkTodaysSolutions(username, userVerified, dailyProblems, streakManager) {
    if (!username || !userVerified || !dailyProblems) {
      logger.debug('ProblemService.checkTodaysSolutions', 'Cannot check - user not verified or no problems');
      return false;
    }

    const today = DateUtils.getUTCDateString();
    
    // If already marked as completed, skip
    if (streakManager.streakData.completedDays[today]) {
      logger.debug('ProblemService.checkTodaysSolutions', 'Today already marked as completed');
      return true;
    }

    try {
      logger.info('ProblemService.checkTodaysSolutions', `Checking solutions for ${username}`);
      
      const submissions = await apiService.fetchUserSubmissions(username, 100);
      const { ratingBased, random } = dailyProblems;
      
      const solvedProblems = [];
      let solvedPersonalized = false;
      let solvedRandom = false;
      
      for (const submission of submissions) {
        const submissionTime = new Date(submission.creationTimeSeconds * 1000);
        const submissionDate = DateUtils.getUTCDateString(submissionTime);
        
        if (submissionDate === today && submission.verdict === 'OK') {
          const problemId = `${submission.problem.contestId}${submission.problem.index}`;
          
          if (ratingBased && `${ratingBased.contestId}${ratingBased.index}` === problemId) {
            solvedProblems.push(problemId);
            solvedPersonalized = true;
            logger.info('ProblemService.checkTodaysSolutions', `Found solved personalized problem: ${problemId}`);
          }
          
          if (random && `${random.contestId}${random.index}` === problemId) {
            solvedProblems.push(problemId);
            solvedRandom = true;
            logger.info('ProblemService.checkTodaysSolutions', `Found solved random problem: ${problemId}`);
          }
        }
      }

      if (solvedProblems.length > 0) {
        await streakManager.markDayCompleted(today, solvedProblems, solvedPersonalized, solvedRandom, username);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('ProblemService.checkTodaysSolutions', 'Error checking solutions', error);
      return false;
    }
  }
}