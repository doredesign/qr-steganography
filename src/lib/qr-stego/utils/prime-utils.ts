/**
 * Prime number utilities for generating even distribution patterns
 * Used to spread hidden bits across the QR code evenly
 */

/**
 * Check if a number is prime
 */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;

  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Find the largest prime number less than max
 * Used for even bit distribution via prime stepping
 */
export function findLargePrime(max: number): number {
  // Start from max-1 and work backwards
  for (let candidate = max - 1; candidate > 2; candidate--) {
    if (isPrime(candidate)) return candidate;
  }
  return 2; // Fallback to smallest prime
}

/**
 * Generate a distribution pattern using prime number stepping
 * This spreads bits evenly across available modules to avoid visual clustering
 *
 * @param bitsNeeded - Number of bits to distribute
 * @param totalModules - Total available modules
 * @returns Array of module indices in distribution order
 */
export function generateDistributionPattern(
  bitsNeeded: number,
  totalModules: number
): number[] {
  if (bitsNeeded > totalModules) {
    throw new Error(
      `Cannot fit ${bitsNeeded} bits into ${totalModules} modules`
    );
  }

  const indices: number[] = [];
  const step = findLargePrime(totalModules);

  let current = 0;
  for (let i = 0; i < bitsNeeded; i++) {
    indices.push(current % totalModules);
    current = (current + step) % totalModules;
  }

  return indices;
}

/**
 * Validate that a distribution pattern has no duplicates
 * (only possible if bitsNeeded <= totalModules)
 */
export function validateDistribution(pattern: number[]): boolean {
  const unique = new Set(pattern);
  return unique.size === pattern.length;
}
