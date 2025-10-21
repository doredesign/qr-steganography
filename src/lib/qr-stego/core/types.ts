/**
 * QR Code Steganography Type Definitions
 * Based on QR_STEGANOGRAPHY_SPEC.md v1.0
 */

/**
 * Error correction levels for QR codes
 */
export enum ECLevel {
  L = 0,  // ~7% error correction
  M = 1,  // ~15% error correction
  Q = 2,  // ~25% error correction
  H = 3,  // ~30% error correction
}

/**
 * Types of modules (pixels) in a QR code
 */
export enum ModuleType {
  FINDER_PATTERN,      // Corner position detection patterns
  SEPARATOR,           // White border around finders
  TIMING_PATTERN,      // Alternating line for alignment
  ALIGNMENT_PATTERN,   // Internal alignment patterns
  FORMAT_INFO,         // Error correction level + mask pattern
  VERSION_INFO,        // QR version (for version 7+)
  DATA_CODEWORD,       // Actual message data
  EC_CODEWORD,         // Error correction codewords
  REMAINDER,           // Padding bits
}

/**
 * Represents a single module (pixel) in the QR code
 */
export interface QRModule {
  x: number;           // X coordinate (0-based)
  y: number;           // Y coordinate (0-based)
  value: boolean;      // true = black/dark, false = white/light
  type: ModuleType;    // What this module represents
  isFlippable: boolean; // Can this module be safely flipped?
}

/**
 * 2D representation of the complete QR code
 */
export interface QRMatrix {
  size: number;                    // Matrix dimension (size x size)
  modules: QRModule[][];           // 2D array of modules
  version: number;                 // QR version (1-40)
  errorCorrectionLevel: ECLevel;   // L, M, Q, or H
  maskPattern: number;             // Mask pattern used (0-7)
  flippedModuleCount?: number;     // Number of modules flipped for steganography
}

/**
 * Position of a module in the QR matrix
 */
export interface ModulePosition {
  x: number;
  y: number;
  index: number;                   // Linear index in module placement order
  dataCodewordIndex?: number;      // Which data codeword this belongs to
}

/**
 * Maps module positions to binary values for encoding/decoding
 */
export interface FlipMap {
  positions: ModulePosition[];     // Ordered list of flippable positions
  encoding: Map<number, boolean>;  // Position index → flip state
}

/**
 * Metadata about the steganographic encoding
 */
export interface StegoMetadata {
  version: string;                 // Spec version (e.g., "1.0")
  timestamp?: number;              // Generation timestamp
  flippedModuleCount: number;      // Number of modules flipped
  ecLevelUsed: ECLevel;            // Should always be H
  capacityUsed: number;            // Percentage of EC capacity used
  checksum?: string;               // Optional integrity check
}

/**
 * Container for both messages and metadata
 */
export interface StegoPayload {
  primaryMessage: string;          // Public message
  secondaryMessage: string;        // Hidden message
  metadata: StegoMetadata;
}

/**
 * Configuration options for encoding
 */
export interface EncodeOptions {
  /** Error correction level (default: H) */
  ecLevel?: ECLevel;

  /** Safety margin for EC usage (default: 0.5 = 50%) */
  safetyMargin?: number;

  /** Include metadata in output (default: true) */
  includeMetadata?: boolean;
}

/**
 * Configuration options for decoding
 */
export interface DecodeOptions {
  /** Strict checksum validation (default: true) */
  strictChecksum?: boolean;

  /** Maximum expected message size in bytes (default: 100) */
  maxMessageSize?: number;
}

/**
 * Result of encoding operation with rendering helpers
 */
export interface QRStegoResult {
  /** QR matrix with flipped modules */
  matrix: QRMatrix;

  /** Render as SVG string */
  toSVG(): string;

  /** Render to Canvas element */
  toCanvas(canvas: HTMLCanvasElement): void;

  /** Get as data URL (for img src) */
  toDataURL(): string;

  /** Get raw module data */
  getModules(): boolean[][];

  /** Metadata about the encoding */
  metadata: StegoMetadata;
}
