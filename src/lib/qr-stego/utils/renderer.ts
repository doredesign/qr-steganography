/**
 * QR Code rendering utilities
 * Provides SVG and Canvas rendering for QR matrices
 */

import type { QRMatrix } from '../core/types';

/**
 * Render QR matrix to SVG string
 */
export function renderToSVG(
  matrix: QRMatrix,
  pixelSize: number = 4,
  border: number = 4
): string {
  const size = matrix.size;
  const totalSize = (size + border * 2) * pixelSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `;
  svg += `width="${totalSize}" height="${totalSize}" `;
  svg += `viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="100%" height="100%" fill="#ffffff"/>`;

  // Render black modules
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y][x].value) {
        const px = (x + border) * pixelSize;
        const py = (y + border) * pixelSize;
        svg += `<rect x="${px}" y="${py}" width="${pixelSize}" `;
        svg += `height="${pixelSize}" fill="#000000"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Render QR matrix to Canvas element
 */
export function renderToCanvas(
  matrix: QRMatrix,
  canvas: HTMLCanvasElement,
  pixelSize: number = 4,
  border: number = 4
): void {
  const size = matrix.size;
  const totalSize = (size + border * 2) * pixelSize;

  // Set canvas dimensions
  canvas.width = totalSize;
  canvas.height = totalSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Draw black modules
  ctx.fillStyle = '#000000';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y][x].value) {
        const px = (x + border) * pixelSize;
        const py = (y + border) * pixelSize;
        ctx.fillRect(px, py, pixelSize, pixelSize);
      }
    }
  }
}

/**
 * Get QR matrix as data URL (PNG)
 */
export function toDataURL(
  matrix: QRMatrix,
  pixelSize: number = 4,
  border: number = 4
): string {
  // Create temporary canvas
  const canvas = document.createElement('canvas');
  renderToCanvas(matrix, canvas, pixelSize, border);

  return canvas.toDataURL('image/png');
}

/**
 * Get raw module data as 2D boolean array
 */
export function getModules(matrix: QRMatrix): boolean[][] {
  return matrix.modules.map(row =>
    row.map(module => module.value)
  );
}

/**
 * Render to SVG with custom colors
 */
export function renderToSVGWithColors(
  matrix: QRMatrix,
  foreground: string = '#000000',
  background: string = '#ffffff',
  pixelSize: number = 4,
  border: number = 4
): string {
  const size = matrix.size;
  const totalSize = (size + border * 2) * pixelSize;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `;
  svg += `width="${totalSize}" height="${totalSize}" `;
  svg += `viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="100%" height="100%" fill="${background}"/>`;

  // Render modules with custom foreground color
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y][x].value) {
        const px = (x + border) * pixelSize;
        const py = (y + border) * pixelSize;
        svg += `<rect x="${px}" y="${py}" width="${pixelSize}" `;
        svg += `height="${pixelSize}" fill="${foreground}"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}
