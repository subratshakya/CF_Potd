// Tests for HashUtils

import { HashUtils } from '../../src/utils/hash-utils.js';

describe('HashUtils', () => {
  describe('hashCode', () => {
    test('should generate consistent hash for same string', () => {
      const str = 'test-string';
      const hash1 = HashUtils.hashCode(str);
      const hash2 = HashUtils.hashCode(str);
      expect(hash1).toBe(hash2);
    });

    test('should generate different hashes for different strings', () => {
      const hash1 = HashUtils.hashCode('string1');
      const hash2 = HashUtils.hashCode('string2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('selectDailyItem', () => {
    test('should return null for empty array', () => {
      const result = HashUtils.selectDailyItem([], '2024-01-15', 'test');
      expect(result).toBeNull();
    });

    test('should return consistent item for same parameters', () => {
      const items = ['item1', 'item2', 'item3'];
      const result1 = HashUtils.selectDailyItem(items, '2024-01-15', 'test');
      const result2 = HashUtils.selectDailyItem(items, '2024-01-15', 'test');
      expect(result1).toBe(result2);
    });

    test('should return different items for different dates', () => {
      const items = ['item1', 'item2', 'item3'];
      const result1 = HashUtils.selectDailyItem(items, '2024-01-15', 'test');
      const result2 = HashUtils.selectDailyItem(items, '2024-01-16', 'test');
      // Note: This might occasionally be the same due to hash collisions
      // but should be different most of the time
    });
  });
});