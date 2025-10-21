/**
 * QR Steganography Encoder
 * Generates QR codes with hidden messages embedded in error correction capacity
 */

import qrcodegen from 'nayuki-qr-code-generator';
import type { QRMatrix, QRModule, FlipMap, ModulePosition, ECLevel, EncodeOptions } from './types';
import { ModuleType } from './types';
import { encodeSecondaryMessage } from '../utils/bit-utils';
import { generateDistributionPattern } from '../utils/prime-utils';
import { identifyFlippableModules, calculateMaxCapacity, isFunctionPattern } from '../utils/qr-analyzer';

const { QrCode } = qrcodegen;

/**
 * Convert our ECLevel enum to Nayuki's Ecc class
 */
function mapECLevel(ecLevel: ECLevel) {
  const mapping = {
    0: QrCode.Ecc.LOW,
    1: QrCode.Ecc.MEDIUM,
    2: QrCode.Ecc.QUARTILE,
    3: QrCode.Ecc.HIGH,
  };
  return mapping[ecLevel] || QrCode.Ecc.HIGH;
}

/**
 * Convert our ECLevel to Nayuki's Ecc
 */
function unmapECLevel(ecc: any): ECLevel {
  if (ecc === QrCode.Ecc.LOW) return 0;
  if (ecc === QrCode.Ecc.MEDIUM) return 1;
  if (ecc === QrCode.Ecc.QUARTILE) return 2;
  if (ecc === QrCode.Ecc.HIGH) return 3;
  return 3; // Default to HIGH
}

/**
 * Determine module type based on position
 * This is a simplified version - full implementation would be more complex
 */
function determineModuleType(x: number, y: number, qr: any): ModuleType {
  const size = qr.size;

  // Check if it's a function module using the QR's isFunction array
  if (qr.isFunction && qr.isFunction[y] && qr.isFunction[y][x]) {
    // It's a function pattern - determine which type
    if (isFunctionPattern(x, y, { size, version: qr.version, modules: [], errorCorrectionLevel: 3, maskPattern: qr.mask })) {
      return ModuleType.FINDER_PATTERN; // Simplified - could be timing, alignment, etc.
    }
  }

  // Otherwise, it's data or EC codeword
  return ModuleType.DATA_CODEWORD;
}

/**
 * Convert Nayuki QR code to our QRMatrix format
 */
function convertToQRMatrix(qr: any): QRMatrix {
  const size = qr.size;
  const modules: QRModule[][] = [];

  for (let y = 0; y < size; y++) {
    modules[y] = [];
    for (let x = 0; x < size; x++) {
      const value = qr.getModule(x, y);
      const type = determineModuleType(x, y, qr);

      modules[y][x] = {
        x,
        y,
        value,
        type,
        isFlippable: type === ModuleType.DATA_CODEWORD
      };
    }
  }

  return {
    size,
    modules,
    version: qr.version,
    errorCorrectionLevel: unmapECLevel(qr.errorCorrectionLevel),
    maskPattern: qr.mask
  };
}

/**
 * Create flip map from secondary message bits
 */
function createFlipMap(
  secondaryBits: boolean[],
  flippableModules: ModulePosition[]
): FlipMap {
  const encoding = new Map<number, boolean>();

  // Generate distribution pattern using prime stepping
  const indices = generateDistributionPattern(
    secondaryBits.length,
    flippableModules.length
  );

  for (let i = 0; i < secondaryBits.length; i++) {
    const moduleIndex = indices[i];
    const shouldFlip = secondaryBits[i];
    encoding.set(moduleIndex, shouldFlip);
  }

  return {
    positions: flippableModules,
    encoding
  };
}

/**
 * Apply module flips to QR matrix
 */
function applyFlips(qr: QRMatrix, flipMap: FlipMap): QRMatrix {
  // Create deep copy
  const stegoQR: QRMatrix = {
    ...qr,
    modules: qr.modules.map(row =>
      row.map(module => ({ ...module }))
    )
  };

  let flippedCount = 0;
  let skippedFunctionPatterns = 0;
  const flipPositions: { x: number; y: number }[] = [];

  // Apply each flip
  for (const [moduleIndex, shouldFlip] of flipMap.encoding) {
    if (!shouldFlip) continue; // Only flip when bit = 1

    const position = flipMap.positions[moduleIndex];
    const module = stegoQR.modules[position.y][position.x];

    // Safety check: don't flip function patterns
    if (isFunctionPattern(position.x, position.y, stegoQR)) {
      console.warn(`WARNING: Attempted to flip function pattern at [${position.x},${position.y}]`);
      skippedFunctionPatterns++;
      continue;
    }

    // Flip the module
    const oldValue = module.value;
    module.value = !module.value;
    flippedCount++;
    flipPositions.push({ x: position.x, y: position.y });
  }

  // Log warnings only for critical issues
  if (skippedFunctionPatterns > 0) {
    console.warn(`⚠️ WARNING: Attempted to flip ${skippedFunctionPatterns} function pattern modules - these were skipped but this indicates a bug in identifyFlippableModules()`);
  }

  // Store flipped count in matrix for metadata
  stegoQR.flippedModuleCount = flippedCount;

  return stegoQR;
}

/**
 * Encode a QR code with hidden message
 */
export function encode(
  primary: string,
  secondary: string,
  options: EncodeOptions = {}
): QRMatrix {
  const {
    ecLevel = 3, // H level
    safetyMargin = 0.07, // 7% targets ~39 flips, accounting for 42% bit density → ~7 bytes capacity
  } = options;

  // Step 1: Generate base QR code at highest error correction level
  const nayukiEcc = mapECLevel(ecLevel as ECLevel);
  const baseQR = QrCode.encodeText(primary, nayukiEcc);

  // Step 2: Convert to our matrix format
  const qrMatrix = convertToQRMatrix(baseQR);

  // Step 3: Identify flippable modules
  const flippableModules = identifyFlippableModules(qrMatrix);

  if (flippableModules.length === 0) {
    throw new Error('No flippable modules found - QR code too small');
  }

  // Step 4: Calculate capacity
  const maxBits = calculateMaxCapacity(
    flippableModules,
    ecLevel as ECLevel,
    safetyMargin
  );

  if (maxBits <= 0) {
    throw new Error('Insufficient capacity for hidden message');
  }

  // Step 5: Encode secondary message to binary
  let secondaryBits: boolean[] = [];

  if (secondary.length > 0) {
    secondaryBits = encodeSecondaryMessage(secondary, maxBits);
  }

  // Step 6: Create flip map
  const flipMap = createFlipMap(secondaryBits, flippableModules);

  // Step 7: Apply flips to QR matrix
  const stegoQR = applyFlips(qrMatrix, flipMap);

  return stegoQR;
}

/**
 * Get maximum capacity for a given primary message
 * @returns Maximum message size in bytes (excluding overhead)
 */
export function getCapacity(primary: string, safetyMargin: number = 0.07): number {
  // Generate QR at highest EC level
  const baseQR = QrCode.encodeText(primary, QrCode.Ecc.HIGH);
  const qrMatrix = convertToQRMatrix(baseQR);

  // Identify flippable modules
  const flippableModules = identifyFlippableModules(qrMatrix);

  // Calculate total capacity in bits (including overhead)
  const totalBits = calculateMaxCapacity(
    flippableModules,
    3, // ECLevel.H
    safetyMargin
  );

  // Subtract overhead (16-bit length + 16-bit checksum = 32 bits)
  const OVERHEAD_BITS = 32;
  const messageBits = totalBits - OVERHEAD_BITS;

  // Return message capacity in bytes
  return Math.max(0, Math.floor(messageBits / 8));
}

/**
 * Validate that a secondary message fits within capacity
 */
export function validateCapacity(primary: string, secondary: string, safetyMargin: number = 0.07): boolean {
  const maxBytes = getCapacity(primary, safetyMargin);
  const encoder = new TextEncoder();
  const secondaryBytes = encoder.encode(secondary);

  return secondaryBytes.length <= maxBytes;
}
