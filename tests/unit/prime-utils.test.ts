import { describe, it, expect } from 'vitest';
import {
  isPrime,
  findLargePrime,
  generateDistributionPattern,
  validateDistribution
} from '../../src/lib/qr-stego/utils/prime-utils';

describe('Prime Utils', () => {
  describe('isPrime', () => {
    it('should identify prime numbers', () => {
      expect(isPrime(2)).toBe(true);
      expect(isPrime(3)).toBe(true);
      expect(isPrime(5)).toBe(true);
      expect(isPrime(7)).toBe(true);
      expect(isPrime(11)).toBe(true);
      expect(isPrime(97)).toBe(true);
    });

    it('should identify non-prime numbers', () => {
      expect(isPrime(0)).toBe(false);
      expect(isPrime(1)).toBe(false);
      expect(isPrime(4)).toBe(false);
      expect(isPrime(6)).toBe(false);
      expect(isPrime(8)).toBe(false);
      expect(isPrime(9)).toBe(false);
      expect(isPrime(100)).toBe(false);
    });
  });

  describe('findLargePrime', () => {
    it('should find largest prime less than max', () => {
      expect(findLargePrime(100)).toBe(97);
      expect(findLargePrime(50)).toBe(47);
      expect(findLargePrime(20)).toBe(19);
      expect(findLargePrime(10)).toBe(7);
    });

    it('should return 2 for small values', () => {
      expect(findLargePrime(3)).toBe(2);
      expect(findLargePrime(2)).toBe(2);
    });
  });

  describe('generateDistributionPattern', () => {
    it('should generate pattern with correct length', () => {
      const pattern = generateDistributionPattern(50, 200);

      expect(pattern.length).toBe(50);
    });

    it('should generate unique indices when bits < modules', () => {
      const pattern = generateDistributionPattern(50, 200);
      const uniqueValues = new Set(pattern);

      // Should use 50 unique positions
      expect(uniqueValues.size).toBe(50);
    });

    it('should keep indices within range', () => {
      const totalModules = 200;
      const pattern = generateDistributionPattern(50, totalModules);

      pattern.forEach(index => {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(totalModules);
      });
    });

    it('should throw when bits needed exceeds available modules', () => {
      expect(() => {
        generateDistributionPattern(300, 200);
      }).toThrow('Cannot fit');
    });

    it('should distribute using prime stepping', () => {
      const pattern = generateDistributionPattern(50, 200);

      // All indices should be unique (no duplicates)
      const uniqueIndices = new Set(pattern);
      expect(uniqueIndices.size).toBe(50);

      // Indices should not be sequential (checking first few)
      const isSequential = pattern.slice(0, 10).every((val, i, arr) =>
        i === 0 || Math.abs(val - arr[i-1]) === 1
      );
      expect(isSequential).toBe(false);
    });
  });

  describe('validateDistribution', () => {
    it('should validate pattern with no duplicates', () => {
      const pattern = [1, 5, 10, 15, 20];
      expect(validateDistribution(pattern)).toBe(true);
    });

    it('should reject pattern with duplicates', () => {
      const pattern = [1, 5, 10, 5, 20];
      expect(validateDistribution(pattern)).toBe(false);
    });
  });
});
