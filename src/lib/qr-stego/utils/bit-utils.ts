/**
 * Bit manipulation and binary encoding/decoding utilities
 */

/**
 * Calculate 16-bit XOR checksum for data integrity
 * Uses CRC-16-CCITT polynomial (0x1021)
 */
export function calculateChecksum(data: Uint8Array): number {
  let checksum = 0xFFFF;

  for (const byte of data) {
    checksum ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (checksum & 0x8000) {
        checksum = (checksum << 1) ^ 0x1021;
      } else {
        checksum <<= 1;
      }
    }
  }

  return checksum & 0xFFFF;
}

/**
 * Encode a string message to binary bits with length prefix and checksum
 * Format: [16-bit length][message bytes][16-bit checksum]
 */
export function encodeSecondaryMessage(
  message: string,
  maxBits: number
): boolean[] {
  // Convert message to bytes
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);

  // Calculate total bits needed: 16 (length) + message + 16 (checksum)
  const OVERHEAD_BITS = 32;
  const totalBitsNeeded = OVERHEAD_BITS + messageBytes.length * 8;

  if (totalBitsNeeded > maxBits) {
    const maxMessageBytes = Math.floor((maxBits - OVERHEAD_BITS) / 8);
    throw new Error(
      `Secondary message too large: ${messageBytes.length} bytes, ` +
      `max ${maxMessageBytes} bytes (including ${OVERHEAD_BITS}-bit overhead)`
    );
  }

  const bits: boolean[] = [];

  // Add length prefix (16 bits = max 8192 bytes)
  const length = messageBytes.length;
  for (let i = 15; i >= 0; i--) {
    bits.push(((length >> i) & 1) === 1);
  }

  // Add message bytes
  for (const byte of messageBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push(((byte >> i) & 1) === 1);
    }
  }

  // Add checksum (16 bits)
  const checksum = calculateChecksum(messageBytes);
  for (let i = 15; i >= 0; i--) {
    bits.push(((checksum >> i) & 1) === 1);
  }

  return bits;
}

/**
 * Decode binary bits back to string message
 * Validates checksum and throws on mismatch
 */
export function decodeSecondaryMessage(bits: boolean[]): string {
  if (bits.length < 32) {
    throw new Error('Insufficient bits for valid message');
  }

  // Extract length (first 16 bits)
  let length = 0;
  for (let i = 0; i < 16; i++) {
    if (bits[i]) {
      length |= (1 << (15 - i));
    }
  }

  // Validate length
  if (length > (bits.length - 32) / 8) {
    throw new Error(`Invalid message length: ${length}`);
  }

  // Handle empty message
  if (length === 0) {
    return '';
  }

  // Extract message bytes
  const messageBytes = new Uint8Array(length);
  for (let byteIdx = 0; byteIdx < length; byteIdx++) {
    let byte = 0;
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      const bitPosition = 16 + (byteIdx * 8) + bitIdx;
      if (bits[bitPosition]) {
        byte |= (1 << (7 - bitIdx));
      }
    }
    messageBytes[byteIdx] = byte;
  }

  // Extract checksum (last 16 bits)
  let checksum = 0;
  const checksumStart = 16 + (length * 8);
  for (let i = 0; i < 16; i++) {
    if (bits[checksumStart + i]) {
      checksum |= (1 << (15 - i));
    }
  }

  // Verify checksum
  const expectedChecksum = calculateChecksum(messageBytes);
  if (checksum !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`
    );
  }

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(messageBytes);
}

/**
 * Convert text to boolean array (for testing)
 */
export function textToBits(text: string): boolean[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const bits: boolean[] = [];

  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push(((byte >> i) & 1) === 1);
    }
  }

  return bits;
}

/**
 * Convert boolean array back to text (for testing)
 */
export function bitsToText(bits: boolean[]): string {
  if (bits.length % 8 !== 0) {
    throw new Error('Bit array length must be multiple of 8');
  }

  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      if (bits[i * 8 + j]) {
        byte |= (1 << (7 - j));
      }
    }
    bytes[i] = byte;
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
