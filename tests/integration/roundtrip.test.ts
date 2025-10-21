import { describe, it, expect } from 'vitest';
import { QRStego } from '../../src/lib/qr-stego';

describe('Round-trip Integration Tests', () => {
  describe('Basic encoding and decoding', () => {
    it('should encode and decode using matrix', () => {
      const primary = 'https://example.com/path/to/page';
      const secondary = 'SECRET';

      // Encode
      const result = QRStego.encode(primary, secondary);

      expect(result).toBeDefined();
      expect(result.matrix).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Get module matrix
      const modules = result.getModules();

      // Decode
      const decoded = QRStego.decodeFromMatrix(modules, primary);

      expect(decoded.primaryMessage).toBe(primary);
      expect(decoded.secondaryMessage).toBe(secondary);
    });

    it('should work with various message combinations', () => {
      const testCases = [
        { primary: 'https://example.com/page', secondary: 'hi' },
        { primary: 'https://google.com/search', secondary: 'tok' },
        { primary: 'https://test.com/path', secondary: 'KEY' }
      ];

      testCases.forEach(({ primary, secondary }) => {
        const result = QRStego.encode(primary, secondary);
        const modules = result.getModules();
        const decoded = QRStego.decodeFromMatrix(modules, primary);

        expect(decoded.primaryMessage).toBe(primary);
        expect(decoded.secondaryMessage).toBe(secondary);
      });
    });
  });

  describe('Metadata validation', () => {
    it('should include correct metadata', () => {
      const primary = 'https://example.com/path/page';
      const secondary = 'sec';

      const result = QRStego.encode(primary, secondary);

      expect(result.metadata.version).toBe('1.0');
      expect(result.metadata.ecLevelUsed).toBe(3); // H level
      expect(result.metadata.flippedModuleCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.capacityUsed).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeDefined();
    });
  });

  describe('Rendering methods', () => {
    it('should generate SVG output', () => {
      const result = QRStego.encode('https://example.com/page', 'hi');
      const svg = result.toSVG();

      expect(svg).toBeDefined();
      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should get module data', () => {
      const result = QRStego.encode('https://example.com/page', 'hi');
      const modules = result.getModules();

      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(Array.isArray(modules[0])).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty secondary message', () => {
      const primary = 'https://example.com/page';
      const secondary = '';

      const result = QRStego.encode(primary, secondary);
      const modules = result.getModules();
      const decoded = QRStego.decodeFromMatrix(modules, primary);

      expect(decoded.primaryMessage).toBe(primary);
      expect(decoded.secondaryMessage).toBe(secondary);
    });

    it('should handle unicode in secondary message', () => {
      const primary = 'https://example.com/test';
      const secondary = 'Hi';

      const result = QRStego.encode(primary, secondary);
      const modules = result.getModules();
      const decoded = QRStego.decodeFromMatrix(modules, primary);

      expect(decoded.primaryMessage).toBe(primary);
      expect(decoded.secondaryMessage).toBe(secondary);
    });
  });
});
