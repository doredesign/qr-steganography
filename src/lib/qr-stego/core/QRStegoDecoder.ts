/**
 * QR Steganography Decoder
 * Extracts hidden messages from steganographic QR codes
 */

import jsQR from 'jsqr';
import qrcodegen from 'nayuki-qr-code-generator';
import type { QRMatrix, ModulePosition, StegoPayload, DecodeOptions, QRModule } from './types';
import { ModuleType } from './types';
import { decodeSecondaryMessage } from '../utils/bit-utils';
import { findLargePrime } from '../utils/prime-utils';
import { identifyFlippableModules, isFunctionPattern } from '../utils/qr-analyzer';

const { QrCode } = qrcodegen;

/**
 * Convert Nayuki QR code to boolean matrix
 */
function qrToModuleMatrix(qr: any): boolean[][] {
  const size = qr.size;
  const matrix: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    matrix[y] = [];
    for (let x = 0; x < size; x++) {
      matrix[y][x] = qr.getModule(x, y);
    }
  }

  return matrix;
}

/**
 * Convert jsQR result to boolean matrix
 * jsQR doesn't directly expose module matrix, so we need to work around this
 */
function extractModuleMatrixFromImage(imageData: ImageData, location: any): boolean[][] | null {
  // This is a simplified approach - in production, you'd need more robust module extraction
  // For now, we'll re-scan using the primary message to get the module positions
  return null;
}

/**
 * Compare two module matrices to find flipped modules
 */
function compareMatrices(
  scanned: boolean[][],
  reference: boolean[][],
  flippableModules: ModulePosition[]
): Set<number> {
  const flippedIndices = new Set<number>();

  // Ensure matrices are same size
  if (scanned.length !== reference.length) {
    throw new Error('Matrix size mismatch');
  }

  // Check each flippable module
  for (let i = 0; i < flippableModules.length; i++) {
    const pos = flippableModules[i];
    const scannedValue = scanned[pos.y][pos.x];
    const referenceValue = reference[pos.y][pos.x];

    if (scannedValue !== referenceValue) {
      flippedIndices.add(i);
    }
  }

  return flippedIndices;
}

/**
 * Extract bits from flipped module positions
 */
function extractBitsFromFlips(
  flipPositions: Set<number>,
  flippableModules: ModulePosition[]
): boolean[] {
  const bits: boolean[] = [];
  const totalModules = flippableModules.length;

  // Use SAME prime stepping pattern as encoder
  const step = findLargePrime(totalModules);

  // Extract first 16 bits for length
  const lengthBits: boolean[] = [];
  let current = 0;

  for (let i = 0; i < 16; i++) {
    const moduleIndex = current % totalModules;
    lengthBits.push(flipPositions.has(moduleIndex));
    current = (current + step) % totalModules;
  }

  // Decode length
  let messageLength = 0;
  for (let i = 0; i < 16; i++) {
    if (lengthBits[i]) {
      messageLength |= (1 << (15 - i));
    }
  }

  // Extract full message + checksum
  const totalBits = 16 + (messageLength * 8) + 16;
  current = 0;

  for (let i = 0; i < totalBits; i++) {
    const moduleIndex = current % totalModules;
    bits.push(flipPositions.has(moduleIndex));
    current = (current + step) % totalModules;
  }

  return bits;
}

/**
 * Decode a steganographic QR code from image data
 */
export function decode(
  imageData: ImageData,
  options: DecodeOptions = {}
): StegoPayload {
  const { strictChecksum = true, maxMessageSize = 100 } = options;

  // Step 1: Decode primary message using standard QR decoder
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  if (!result) {
    throw new Error('No QR code found in image');
  }

  const primaryMessage = result.data;

  // Step 2: Regenerate "clean" reference QR from primary message
  const referenceQR = QrCode.encodeText(primaryMessage, QrCode.Ecc.HIGH);

  // Step 3: Extract module matrix from scanned QR using location data
  const scannedMatrix = extractModulesFromImage(imageData, result.location, referenceQR.size);

  // Step 4: Convert reference to matrix
  const referenceMatrix = qrToModuleMatrix(referenceQR);

  console.log('Matrix sizes:', {
    scanned: `${scannedMatrix.length}x${scannedMatrix[0]?.length}`,
    reference: `${referenceMatrix.length}x${referenceMatrix[0]?.length}`,
    expected: referenceQR.size
  });

  // Step 5: Convert reference QR to full QRMatrix structure (needed for identifyFlippableModules)
  const qrMatrixStruct = convertToFullQRMatrix(referenceQR);

  // Step 6: Identify flippable positions (must match encoder)
  const flippableModules = identifyFlippableModules(qrMatrixStruct);

  // Step 7: Compare matrices to find flipped modules
  const flipPositions = compareMatrices(scannedMatrix, referenceMatrix, flippableModules);

  if (flipPositions.size === 0) {
    return {
      primaryMessage,
      secondaryMessage: '',
      metadata: {
        version: '1.0',
        flippedModuleCount: 0,
        ecLevelUsed: 3,
        capacityUsed: 0
      }
    };
  }

  // Step 8: Extract bits from flip positions
  const secondaryBits = extractBitsFromFlips(flipPositions, flippableModules);

  // Step 9: Decode secondary message
  let secondaryMessage = '';
  try {
    secondaryMessage = decodeSecondaryMessage(secondaryBits);
  } catch (err) {
    if (strictChecksum) {
      throw err;
    }
    // If not strict, return empty secondary message
    secondaryMessage = '';
  }

  return {
    primaryMessage,
    secondaryMessage,
    metadata: {
      version: '1.0',
      flippedModuleCount: flipPositions.size,
      ecLevelUsed: 3,
      capacityUsed: (flipPositions.size / flippableModules.length) * 100
    }
  };
}

/**
 * Extract module matrix from image using QR code location
 */
function extractModulesFromImage(
  imageData: ImageData,
  location: any,
  qrSize: number
): boolean[][] {
  const matrix: boolean[][] = [];

  // Calculate the transformation from module coordinates to image pixels
  const topLeft = location.topLeftCorner;
  const topRight = location.topRightCorner;
  const bottomLeft = location.bottomLeftCorner;

  // Calculate module size in pixels
  const widthInPixels = topRight.x - topLeft.x;
  const heightInPixels = bottomLeft.y - topLeft.y;
  const moduleWidth = widthInPixels / qrSize;
  const moduleHeight = heightInPixels / qrSize;

  // Sample each module position
  for (let moduleY = 0; moduleY < qrSize; moduleY++) {
    matrix[moduleY] = [];
    for (let moduleX = 0; moduleX < qrSize; moduleX++) {
      // Calculate pixel position (center of module)
      const pixelX = Math.round(topLeft.x + (moduleX + 0.5) * moduleWidth);
      const pixelY = Math.round(topLeft.y + (moduleY + 0.5) * moduleHeight);

      // Ensure we're within bounds
      if (pixelX >= 0 && pixelX < imageData.width && pixelY >= 0 && pixelY < imageData.height) {
        // Get pixel grayscale value
        const pixelIndex = (pixelY * imageData.width + pixelX) * 4;
        const r = imageData.data[pixelIndex];
        const g = imageData.data[pixelIndex + 1];
        const b = imageData.data[pixelIndex + 2];
        const gray = (r + g + b) / 3;

        // Threshold: dark = true (black module), light = false (white module)
        matrix[moduleY][moduleX] = gray < 128;
      } else {
        matrix[moduleY][moduleX] = false;
      }
    }
  }

  return matrix;
}

/**
 * Convert Nayuki QR to full QRMatrix structure
 */
function convertToFullQRMatrix(qr: any): QRMatrix {
  const size = qr.size;
  const modules: QRModule[][] = [];

  for (let y = 0; y < size; y++) {
    modules[y] = [];
    for (let x = 0; x < size; x++) {
      const value = qr.getModule(x, y);

      // Determine if it's a function pattern
      const isFunctionMod = isFunctionPattern(x, y, {
        size,
        modules: [],
        version: qr.version,
        errorCorrectionLevel: 3,
        maskPattern: qr.mask
      });

      modules[y][x] = {
        x,
        y,
        value,
        type: isFunctionMod ? ModuleType.FINDER_PATTERN : ModuleType.DATA_CODEWORD,
        isFlippable: !isFunctionMod
      };
    }
  }

  return {
    size,
    modules,
    version: qr.version,
    errorCorrectionLevel: 3,
    maskPattern: qr.mask
  };
}

/**
 * Decode from a QR matrix directly (for testing)
 */
export function decodeFromMatrix(
  scannedMatrix: boolean[][],
  primaryMessage: string
): StegoPayload {
  // Regenerate reference QR
  const referenceQR = QrCode.encodeText(primaryMessage, QrCode.Ecc.HIGH);
  const referenceMatrix = qrToModuleMatrix(referenceQR);

  // Convert to full QR matrix structure
  const qrMatrixStruct = convertToFullQRMatrix(referenceQR);

  const flippableModules = identifyFlippableModules(qrMatrixStruct);

  // Compare matrices
  const flipPositions = compareMatrices(scannedMatrix, referenceMatrix, flippableModules);

  if (flipPositions.size === 0) {
    return {
      primaryMessage,
      secondaryMessage: '',
      metadata: {
        version: '1.0',
        flippedModuleCount: 0,
        ecLevelUsed: 3,
        capacityUsed: 0
      }
    };
  }

  // Extract bits
  const secondaryBits = extractBitsFromFlips(flipPositions, flippableModules);

  // Decode message
  const secondaryMessage = decodeSecondaryMessage(secondaryBits);

  return {
    primaryMessage,
    secondaryMessage,
    metadata: {
      version: '1.0',
      flippedModuleCount: flipPositions.size,
      ecLevelUsed: 3,
      capacityUsed: (flipPositions.size / flippableModules.length) * 100
    }
  };
}
