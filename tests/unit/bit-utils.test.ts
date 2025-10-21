import { describe, it, expect } from 'vitest';
import {
  calculateChecksum,
  encodeSecondaryMessage,
  decodeSecondaryMessage,
  textToBits,
  bitsToText
} from '../../src/lib/qr-stego/utils/bit-utils';

describe('Bit Utils', () => {
  describe('calculateChecksum', () => {
    it('should calculate checksum for data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const checksum = calculateChecksum(data);

      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('number');
      expect(checksum).toBeGreaterThanOrEqual(0);
      expect(checksum).toBeLessThanOrEqual(0xFFFF);
    });

    it('should produce same checksum for same data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const checksum1 = calculateChecksum(data);
      const checksum2 = calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksum for different data', () => {
      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([1, 2, 3, 4, 6]);

      const checksum1 = calculateChecksum(data1);
      const checksum2 = calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('textToBits and bitsToText', () => {
    it('should convert text to bits and back', () => {
      const text = 'Hello, World!';
      const bits = textToBits(text);
      const decoded = bitsToText(bits);

      expect(decoded).toBe(text);
    });

    it('should handle empty string', () => {
      const text = '';
      const bits = textToBits(text);
      const decoded = bitsToText(bits);

      expect(decoded).toBe(text);
    });

    it('should handle unicode characters', () => {
      const text = 'Hello 世界 🌍';
      const bits = textToBits(text);
      const decoded = bitsToText(bits);

      expect(decoded).toBe(text);
    });
  });

  describe('encodeSecondaryMessage and decodeSecondaryMessage', () => {
    it('should encode and decode message with checksum', () => {
      const message = 'SECRET';
      const maxBits = 1000;

      const bits = encodeSecondaryMessage(message, maxBits);
      const decoded = decodeSecondaryMessage(bits);

      expect(decoded).toBe(message);
    });

    it('should throw on message too large', () => {
      const message = 'x'.repeat(200);
      const maxBits = 100; // Too small

      expect(() => {
        encodeSecondaryMessage(message, maxBits);
      }).toThrow('Secondary message too large');
    });

    it('should detect corrupted checksum', () => {
      const message = 'SECRET';
      const maxBits = 1000;

      const bits = encodeSecondaryMessage(message, maxBits);

      // Corrupt a bit in the message (not in length or checksum)
      bits[20] = !bits[20];

      expect(() => {
        decodeSecondaryMessage(bits);
      }).toThrow('Checksum mismatch');
    });

    it('should handle various message lengths', () => {
      const messages = ['A', 'Hello', 'This is a longer message'];

      messages.forEach(message => {
        const bits = encodeSecondaryMessage(message, 1000);
        const decoded = decodeSecondaryMessage(bits);
        expect(decoded).toBe(message);
      });
    });
  });
});
