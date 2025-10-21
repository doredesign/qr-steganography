/**
 * QR Code structure analysis utilities
 * Identifies safe zones for module flipping
 */

import type { QRMatrix, QRModule, ModulePosition, ECLevel } from '../core/types';
import { ModuleType } from '../core/types';

/**
 * Alignment pattern positions for different QR versions
 * Based on QR Code specification ISO/IEC 18004
 */
const ALIGNMENT_PATTERN_POSITIONS: { [version: number]: number[] } = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  // Add more as needed...
};

/**
 * Check if a position is within a finder pattern (3 corners)
 */
function isInFinderPattern(x: number, y: number, size: number): boolean {
  // Top-left finder (includes 1-module white border)
  const inTopLeft = x < 9 && y < 9;

  // Top-right finder
  const inTopRight = x >= size - 8 && y < 9;

  // Bottom-left finder
  const inBottomLeft = x < 9 && y >= size - 8;

  return inTopLeft || inTopRight || inBottomLeft;
}

/**
 * Check if a position is in a timing pattern
 */
function isInTimingPattern(x: number, y: number): boolean {
  return x === 6 || y === 6;
}

/**
 * Check if a position is in an alignment pattern
 */
function isInAlignmentPattern(x: number, y: number, version: number): boolean {
  if (version < 2) return false;

  const positions = ALIGNMENT_PATTERN_POSITIONS[version];
  if (!positions) return false;

  // Check if (x, y) is within 2 modules of any alignment center
  // Alignment patterns are 5x5
  for (const centerX of positions) {
    for (const centerY of positions) {
      // Skip if overlaps with finder pattern
      if ((centerX < 9 && centerY < 9)) continue;

      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);

      if (dx <= 2 && dy <= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a position is in format information area
 */
function isInFormatInfo(x: number, y: number, size: number): boolean {
  // Format info is encoded in two places:
  // 1. Around top-left finder (horizontal and vertical)
  // 2. Split between top-right and bottom-left finders

  // Top-left horizontal (y=8, x=0-8 excluding x=6)
  if (y === 8 && x <= 8) return true;

  // Top-left vertical (x=8, y=0-8 excluding y=6)
  if (x === 8 && y <= 8) return true;

  // Top-right (y=8, x from size-8 to size-1)
  if (y === 8 && x >= size - 8) return true;

  // Bottom-left (x=8, y from size-7 to size-1)
  if (x === 8 && y >= size - 7) return true;

  return false;
}

/**
 * Check if a position is in version information area (version 7+)
 */
function isInVersionInfo(x: number, y: number, size: number, version: number): boolean {
  if (version < 7) return false;

  // Version info is in two 3x6 blocks:
  // 1. Bottom-left corner (below bottom-left finder)
  // 2. Top-right corner (right of top-right finder)

  // Bottom-left block (x=0-5, y=size-11 to size-9)
  if (x <= 5 && y >= size - 11 && y <= size - 9) return true;

  // Top-right block (x=size-11 to size-9, y=0-5)
  if (y <= 5 && x >= size - 11 && x <= size - 9) return true;

  return false;
}

/**
 * Determine if a module is a function pattern (non-flippable)
 */
export function isFunctionPattern(
  x: number,
  y: number,
  qr: QRMatrix
): boolean {
  const { size, version } = qr;

  if (isInFinderPattern(x, y, size)) return true;
  if (isInTimingPattern(x, y)) return true;
  if (isInAlignmentPattern(x, y, version)) return true;
  if (isInFormatInfo(x, y, size)) return true;
  if (isInVersionInfo(x, y, size, version)) return true;

  return false;
}

/**
 * Identify all modules that can be safely flipped
 * Returns positions in data placement order
 */
export function identifyFlippableModules(qr: QRMatrix): ModulePosition[] {
  const flippable: ModulePosition[] = [];

  // Iterate through all modules
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      const module = qr.modules[y][x];

      // Skip function patterns (unsafe to flip)
      if (isFunctionPattern(x, y, qr)) {
        continue;
      }

      // Only flip data codeword modules
      // EC codewords are more visible when flipped
      if (module.type === ModuleType.DATA_CODEWORD) {
        flippable.push({
          x: module.x,
          y: module.y,
          index: flippable.length
        });
      }
    }
  }

  return flippable;
}

/**
 * Calculate maximum capacity for hidden data
 * Takes into account EC level and safety margin
 * @returns Total bits available (including space for overhead)
 */
export function calculateMaxCapacity(
  flippableModules: ModulePosition[],
  ecLevel: ECLevel,
  safetyMargin: number = 0.07
): number {
  // For QR code steganography, we can flip a percentage of data modules
  // while staying within error correction capacity

  // The number of modules we can safely flip depends on:
  // 1. Total flippable modules
  // 2. EC level (H = 30% correction)
  // 3. Safety margin to account for real-world scanning issues

  const totalFlippableModules = flippableModules.length;

  // At Level H, we have 30% error correction capacity (theoretical)
  // However, empirical testing shows that flipping >37 modules (~6.6%) breaks scanning
  // Use 7% safety margin to target ~39 flips (slightly conservative)
  const targetFlips = Math.floor(totalFlippableModules * safetyMargin);

  // IMPORTANT: Not all bits are flips!
  // Empirical testing: 7 chars (88 bits) → 37 flips → 42% bit density
  // This accounts for length prefix, message content, and checksum
  const BIT_DENSITY = 0.42; // 42% of bits will be 1s (flips) on average
  const totalBitsCapacity = Math.floor(targetFlips / BIT_DENSITY);

  // Return total capacity (caller must account for overhead)
  return Math.max(0, totalBitsCapacity);
}

/**
 * Get EC capacity as a percentage for different levels
 */
export function getECCapacity(ecLevel: ECLevel): number {
  const capacities = {
    0: 0.07,  // L: 7% of total bits
    1: 0.15,  // M: 15%
    2: 0.25,  // Q: 25%
    3: 0.30,  // H: 30%
  };

  return capacities[ecLevel] || 0.30;
}
