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
      streakModel.updatePersonalizedStreak('2024-01-15');
      
      expect(streakModel.streakData.personalizedStreak).toBe(1);
      expect(streakModel.streakData.lastPersonalizedDate).toBe('2024-01-15');
      expect(streakModel.streakData.maxPersonalizedStreak).toBe(1);
    });

    test('should increment streak for consecutive days', () => {
      streakModel.streakData.personalizedStreak = 1;
      streakModel.streakData.lastPersonalizedDate = '2024-01-15';
      
      streakModel.updatePersonalizedStreak('2024-01-16');
      
      expect(streakModel.streakData.personalizedStreak).toBe(2);
      expect(streakModel.streakData.maxPersonalizedStreak).toBe(2);
    });

    test('should reset streak for non-consecutive days', () => {
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
});