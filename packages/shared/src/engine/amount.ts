/**
 * Dynamic Decimal Allocation Engine for PaisaBridge PK
 * Manages unique decimal offsets (e.g. .01 to .99) per payment account to allow
 * 100% automated matching without official bank APIs.
 */

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface DecimalAllocationOptions {
  min?: number; // default 0.01
  max?: number; // default 0.99
  step?: number; // default 0.01
  strategy?: 'random' | 'sequential';
}

/**
 * Finds an unreserved decimal offset from the allowed pool
 */
export function allocateDecimalOffset(
  reservedOffsets: number[],
  options: DecimalAllocationOptions = {}
): number | null {
  const min = options.min ?? 0.01;
  const max = options.max ?? 0.99;
  const step = options.step ?? 0.01;
  const strategy = options.strategy ?? 'random';

  // Normalize reserved set into integer cents to prevent floating point drift
  const reservedCents = new Set<number>(
    reservedOffsets.map((o) => Math.round(o * 100))
  );

  const available: number[] = [];
  const minCents = Math.round(min * 100);
  const maxCents = Math.round(max * 100);
  const stepCents = Math.max(1, Math.round(step * 100));

  for (let c = minCents; c <= maxCents; c += stepCents) {
    if (!reservedCents.has(c)) {
      available.push(c / 100);
    }
  }

  if (available.length === 0) {
    return null; // All decimal slots are currently occupied
  }

  if (strategy === 'random') {
    const randomIndex = Math.floor(Math.random() * available.length);
    return round2(available[randomIndex]);
  }

  return round2(available[0]);
}

/**
 * Calculates total amount: baseAmount + decimalOffset rounded cleanly
 */
export function calculateTotalAmount(baseAmount: number, decimalOffset: number): number {
  return round2(baseAmount + decimalOffset);
}
