// Tests for DateUtils

import { DateUtils } from '../../src/utils/date-utils.js';

describe('DateUtils', () => {
  describe('getUTCDateString', () => {
    test('should return UTC date string in YYYY-MM-DD format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = DateUtils.getUTCDateString(date);
      expect(result).toBe('2024-01-15');
    });

    test('should handle timezone differences correctly', () => {
      const date = new Date('2024-01-15T23:30:00-05:00'); // EST
      const result = DateUtils.getUTCDateString(date);
      expect(result).toBe('2024-01-16'); // Should be next day in UTC
    });
  });

  describe('isSameUTCDay', () => {
    test('should return true for same UTC day', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T20:00:00Z');
      expect(DateUtils.isSameUTCDay(date1, date2)).toBe(true);
    });

    test('should return false for different UTC days', () => {
      const date1 = new Date('2024-01-15T23:00:00Z');
      const date2 = new Date('2024-01-16T01:00:00Z');
      expect(DateUtils.isSameUTCDay(date1, date2)).toBe(false);
    });
  });

  describe('getDaysDifference', () => {
    test('should calculate days difference correctly', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-18T15:00:00Z');
      expect(DateUtils.getDaysDifference(date1, date2)).toBe(3);
    });

    test('should handle negative differences', () => {
      const date1 = new Date('2024-01-18T10:00:00Z');
      const date2 = new Date('2024-01-15T15:00:00Z');
      expect(DateUtils.getDaysDifference(date1, date2)).toBe(-3);
    });
  });
});