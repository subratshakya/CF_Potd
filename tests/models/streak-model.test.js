// Tests for StreakModel

import { StreakModel } from '../../src/models/streak-model.js';

// Mock StorageService
jest.mock('../../src/services/storage-service.js', () => ({
  StorageService: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

describe('StreakModel', () => {
  let streakModel;

  beforeEach(() => {
    streakModel = new StreakModel('testuser');
    streakModel.streakData = streakModel.getDefaultStreakData();
  });

  describe('getDefaultStreakData', () => {
    test('should return default streak data structure', () => {
      const defaultData = streakModel.getDefaultStreakData();
      
      expect(defaultData).toHaveProperty('personalizedStreak', 0);
      expect(defaultData).toHaveProperty('randomStreak', 0);
      expect(defaultData).toHaveProperty('maxPersonalizedStreak', 0);
      expect(defaultData).toHaveProperty('maxRandomStreak', 0);
      expect(defaultData).toHaveProperty('completedDays', {});
      expect(defaultData).toHaveProperty('lastPersonalizedDate', null);
      expect(defaultData).toHaveProperty('lastRandomDate', null);
    });
  });

  describe('updatePersonalizedStreak', () => {
    test('should start streak at 1 for first solve', () => {
      // Mark today as completed first
      const today = '2024-01-15';
      streakModel.streakData.completedDays[today] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      streakModel.updatePersonalizedStreak('2024-01-15');
      
      expect(streakModel.streakData.personalizedStreak).toBe(1);
      expect(streakModel.streakData.lastPersonalizedDate).toBe('2024-01-15');
      expect(streakModel.streakData.maxPersonalizedStreak).toBe(1);
    });

    test('should increment streak for consecutive days', () => {
      // Set up consecutive days
      streakModel.streakData.completedDays['2024-01-15'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      streakModel.streakData.completedDays['2024-01-16'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      streakModel.streakData.personalizedStreak = 1;
      streakModel.streakData.lastPersonalizedDate = '2024-01-15';
      
      streakModel.updatePersonalizedStreak('2024-01-16');
      
      expect(streakModel.streakData.personalizedStreak).toBe(2);
      expect(streakModel.streakData.maxPersonalizedStreak).toBe(2);
    });

    test('should calculate correct streak for non-consecutive days', () => {
      // Set up non-consecutive days (gap on 2024-01-16 and 2024-01-17)
      streakModel.streakData.completedDays['2024-01-15'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      streakModel.streakData.completedDays['2024-01-18'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      streakModel.streakData.personalizedStreak = 5;
      streakModel.streakData.lastPersonalizedDate = '2024-01-15';
      
      streakModel.updatePersonalizedStreak('2024-01-18'); // Gap of 2 days
      
      expect(streakModel.streakData.personalizedStreak).toBe(1);
    });
  });

  describe('isTodayCompleted', () => {
    test('should return false for uncompleted day', () => {
      const result = streakModel.isTodayCompleted();
      
      expect(result.any).toBe(false);
      expect(result.personalized).toBe(false);
      expect(result.random).toBe(false);
    });

    test('should return correct status for completed day', () => {
      const today = new Date().toISOString().split('T')[0];
      streakModel.streakData.completedDays[today] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      const result = streakModel.isTodayCompleted();
      
      expect(result.any).toBe(true);
      expect(result.personalized).toBe(true);
      expect(result.random).toBe(false);
    });
  });

  describe('calculateCurrentStreak', () => {
    test('should calculate streak correctly for consecutive days', () => {
      // Set up 3 consecutive days
      const today = '2024-01-18';
      streakModel.streakData.completedDays['2024-01-16'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      streakModel.streakData.completedDays['2024-01-17'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      streakModel.streakData.completedDays['2024-01-18'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      const streak = streakModel.calculateCurrentStreak('personalized', today);
      expect(streak).toBe(3);
    });

    test('should return 0 for no completed days', () => {
      const streak = streakModel.calculateCurrentStreak('personalized', '2024-01-15');
      expect(streak).toBe(0);
    });

    test('should handle gaps in completion correctly', () => {
      // Set up days with a gap
      const today = '2024-01-18';
      streakModel.streakData.completedDays['2024-01-15'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      // Gap on 2024-01-16 and 2024-01-17
      streakModel.streakData.completedDays['2024-01-18'] = {
        solved: true,
        solvedPersonalized: true,
        solvedRandom: false
      };
      
      const streak = streakModel.calculateCurrentStreak('personalized', today);
      expect(streak).toBe(1); // Only today counts due to gap
    });
  });

  describe('saveKnownGoodStreak', () => {
    test('should save current streak as known good state', async () => {
      streakModel.streakData.personalizedStreak = 5;
      streakModel.streakData.randomStreak = 3;
      
      const result = await streakModel.saveKnownGoodStreak();
      
      expect(result).toBe(true);
      expect(streakModel.streakData.lastKnownGoodStreak.personalizedStreak).toBe(5);
      expect(streakModel.streakData.lastKnownGoodStreak.randomStreak).toBe(3);
      expect(streakModel.streakData.lastKnownGoodStreak.timestamp).toBeTruthy();
    });
  });

  describe('restoreFromKnownGoodStreak', () => {
    test('should restore streak from known good state if recent', async () => {
      // Set up known good state from yesterday
      streakModel.streakData.lastKnownGoodStreak = {
        personalizedStreak: 5,
        randomStreak: 3,
        maxPersonalizedStreak: 10,
        maxRandomStreak: 8,
        timestamp: Date.now() - (24 * 60 * 60 * 1000) // 1 day ago
      };
      streakModel.streakData.lastSuccessfulCheck = '2024-01-14'; // Yesterday
      
      // Current streak is 0 (due to server error)
      streakModel.streakData.personalizedStreak = 0;
      streakModel.streakData.randomStreak = 0;
      
      const result = await streakModel.restoreFromKnownGoodStreak();
      
      expect(result).toBe(true);
      expect(streakModel.streakData.personalizedStreak).toBe(5);
      expect(streakModel.streakData.randomStreak).toBe(3);
    });

    test('should not restore if known good state is too old', async () => {
      // Set up old known good state
      streakModel.streakData.lastKnownGoodStreak = {
        personalizedStreak: 5,
        randomStreak: 3,
        timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000) // 5 days ago
      };
      streakModel.streakData.lastSuccessfulCheck = '2024-01-10'; // 5 days ago
      
      const result = await streakModel.restoreFromKnownGoodStreak();
      
      expect(result).toBe(false);
    });
  });
});