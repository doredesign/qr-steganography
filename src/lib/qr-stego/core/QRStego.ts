/**
 * QR Steganography Main API
 * Public interface for encoding and decoding steganographic QR codes
 */

import type { EncodeOptions, DecodeOptions, QRStegoResult, StegoPayload } from './types';
import * as Encoder from './QRStegoEncoder';
import * as Decoder from './QRStegoDecoder';
import * as Renderer from '../utils/renderer';

/**
 * Main QR Steganography API
 */
export class QRStego {
  /**
   * Generate a QR code with hidden message
   * @param primary - Public message (visible to all scanners)
   * @param secondary - Hidden message (requires specialized decoder)
   * @param options - Configuration options
   * @returns QR result with rendering helpers
   */
  static encode(
    primary: string,
    secondary: string,
    options?: EncodeOptions
  ): QRStegoResult {
    // Encode the QR matrix
    const matrix = Encoder.encode(primary, secondary, options);

    // Calculate metadata
    const flippedCount = matrix.flippedModuleCount || 0;
    const totalModules = matrix.size * matrix.size;
    const capacityUsed = (flippedCount / totalModules) * 100;

    const metadata = {
      version: '1.0',
      timestamp: Date.now(),
      flippedModuleCount: flippedCount,
      ecLevelUsed: matrix.errorCorrectionLevel,
      capacityUsed
    };

    // Return result with rendering methods
    return {
      matrix,
      metadata,

      toSVG(): string {
        return Renderer.renderToSVG(matrix);
      },

      toCanvas(canvas: HTMLCanvasElement): void {
        Renderer.renderToCanvas(matrix, canvas);
      },

      toDataURL(): string {
        return Renderer.toDataURL(matrix);
      },

      getModules(): boolean[][] {
        return Renderer.getModules(matrix);
      }
    };
  }

  /**
   * Decode both messages from a scanned QR code
   * @param imageData - Scanned QR code image
   * @param options - Decoding options
   * @returns Both primary and secondary messages
   */
  static decode(
    imageData: ImageData,
    options?: DecodeOptions
  ): StegoPayload {
    return Decoder.decode(imageData, options);
  }

  /**
   * Decode from a raw module matrix (for testing)
   * @param moduleMatrix - Boolean 2D array representing QR modules
   * @param primaryMessage - The known primary message
   * @returns Decoded payload
   */
  static decodeFromMatrix(
    moduleMatrix: boolean[][],
    primaryMessage: string
  ): StegoPayload {
    return Decoder.decodeFromMatrix(moduleMatrix, primaryMessage);
  }

  /**
   * Get maximum secondary message capacity for a given primary message
   * @param primary - Primary message
   * @param safetyMargin - Safety margin (default: 0.5 = 50%)
   * @returns Max bytes available for secondary message
   */
  static getCapacity(primary: string, safetyMargin?: number): number {
    return Encoder.getCapacity(primary, safetyMargin);
  }

  /**
   * Validate that a secondary message fits within capacity
   * @param primary - Primary message
   * @param secondary - Secondary message to test
   * @param safetyMargin - Safety margin (default: 0.5 = 50%)
   * @returns True if secondary fits, false otherwise
   */
  static validateCapacity(
    primary: string,
    secondary: string,
    safetyMargin?: number
  ): boolean {
    return Encoder.validateCapacity(primary, secondary, safetyMargin);
  }
}
