import { describe, it, expect } from 'vitest';
import { QRStego } from '../../src/lib/qr-stego';

describe('Capacity Tests', () => {
  describe('getCapacity', () => {
    it('should calculate capacity for small message', () => {
      const capacity = QRStego.getCapacity('https://example.com');

      expect(capacity).toBeGreaterThanOrEqual(0);
      expect(typeof capacity).toBe('number');
    });

    it('should calculate capacity for medium message', () => {
      const capacity = QRStego.getCapacity('https://example.com/path/to/page');

      expect(capacity).toBeGreaterThan(0);
    });

    it('should calculate capacity for longer message', () => {
      const capacity = QRStego.getCapacity('x'.repeat(100));

      expect(capacity).toBeGreaterThan(0);
    });

    it('should increase capacity with lower safety margin', () => {
      const primary = 'https://example.com';

      const capacity50 = QRStego.getCapacity(primary, 0.5);
      const capacity70 = QRStego.getCapacity(primary, 0.7);

      expect(capacity70).toBeGreaterThan(capacity50);
    });
  });

  describe('validateCapacity', () => {
    it('should validate small secondary message', () => {
      const primary = 'https://example.com/path/page';
      const secondary = 'tok';

      const valid = QRStego.validateCapacity(primary, secondary);

      expect(valid).toBe(true);
    });

    it('should reject oversized secondary message', () => {
      const primary = 'short';
      const secondary = 'x'.repeat(1000); // Way too large

      const valid = QRStego.validateCapacity(primary, secondary);

      expect(valid).toBe(false);
    });

    it('should work with various message combinations', () => {
      const testCases = [
        { primary: 'https://example.com/page', secondary: 'hi', expected: true },
        { primary: 'https://google.com/search', secondary: 'token', expected: true },
        { primary: 'short', secondary: 'x'.repeat(100), expected: false }
      ];

      testCases.forEach(({ primary, secondary, expected }) => {
        const valid = QRStego.validateCapacity(primary, secondary);
        expect(valid).toBe(expected);
      });
    });
  });

  describe('Encoding capacity constraints', () => {
    it('should throw when secondary message is too large', () => {
      const primary = 'test';
      const secondary = 'x'.repeat(1000);

      expect(() => {
        QRStego.encode(primary, secondary);
      }).toThrow();
    });

    it('should succeed when secondary message fits', () => {
      const primary = 'https://example.com/path/page';
      const secondary = 'tok';

      expect(() => {
        QRStego.encode(primary, secondary);
      }).not.toThrow();
    });
  });
});
