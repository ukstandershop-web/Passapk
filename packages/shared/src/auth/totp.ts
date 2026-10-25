import { sha256Hex } from '../crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes Uint8Array into Base32 string
 */
export function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes Base32 string into Uint8Array
 */
export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generates a cryptographically random 20-byte base32 TOTP secret
 */
export function generateTotpSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * Generates standard 6-digit TOTP code for a given counter
 */
export async function generateTotpCodeForCounter(secretBase32: string, counter: number): Promise<string> {
  const keyBytes = base32Decode(secretBase32);

  // Counter to 8-byte big-endian buffer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setBigUint64(0, BigInt(counter), false);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const hash = new Uint8Array(signature);

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Generates current 6-digit TOTP code
 */
export async function generateTotpCode(secretBase32: string): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  return generateTotpCodeForCounter(secretBase32, counter);
}

/**
 * Verifies 6-digit TOTP code with time drift window (default +/- 1 step = +/- 30s)
 */
export async function verifyTotpCode(
  secretOrOpts: string | { token: string; secret: string },
  userCodeParam?: string,
  toleranceSteps = 1
): Promise<boolean> {
  if (typeof secretOrOpts === 'object') {
    const { token, secret } = secretOrOpts;
    return verifyTotpCode(secret, token, toleranceSteps);
  }
  const secretBase32 = secretOrOpts;
  const userCode = userCodeParam || '';
  const cleanCode = userCode.trim();
  if (cleanCode.length !== 6) return false;

  const epoch = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(epoch / 30);

  for (let offset = -toleranceSteps; offset <= toleranceSteps; offset++) {
    const expected = await generateTotpCodeForCounter(secretBase32, currentCounter + offset);
    if (expected === cleanCode) {
      return true;
    }
  }

  return false;
}

/**
 * Generates Google Authenticator compatible otpauth:// URI
 */
export function generateTotpUri(
  labelOrOpts: string | { secret: string; accountName?: string; issuer?: string },
  issuerParam?: string,
  secretBase32Param?: string
): string {
  if (typeof labelOrOpts === 'object') {
    const { secret, accountName = 'user', issuer = 'PaisaBridge PK' } = labelOrOpts;
    const encodedLabel = encodeURIComponent(`${issuer}:${accountName}`);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
  const label = labelOrOpts;
  const issuer = issuerParam || 'PaisaBridge PK';
  const secretBase32 = secretBase32Param || '';
  const encodedLabel = encodeURIComponent(`${issuer}:${label}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedLabel}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates single-use backup recovery codes
 */
export async function generateBackupCodes(count = 8): Promise<{
  rawCodes: string[];
  hashedCodes: string[];
}> {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4)}`; // e.g. 7A1F-9C4B

    rawCodes.push(formatted);
    const hashed = await sha256Hex(formatted.toUpperCase());
    hashedCodes.push(hashed);
  }

  return { rawCodes, hashedCodes };
}

/**
 * Verifies and consumes a single-use backup recovery code
 */
export async function verifyBackupCode(
  inputCode: string,
  storedHashedCodes: string[]
): Promise<{ isValid: boolean; remainingHashedCodes: string[] }> {
  const clean = inputCode.trim().toUpperCase();
  const hash = await sha256Hex(clean);

  const index = storedHashedCodes.indexOf(hash);
  if (index === -1) {
    return { isValid: false, remainingHashedCodes: storedHashedCodes };
  }

  const remaining = [...storedHashedCodes];
  remaining.splice(index, 1);
  return { isValid: true, remainingHashedCodes: remaining };
}

export const generateOtpAuthUri = generateTotpUri;
export const verifyTotp = verifyTotpCode;
