/**
 * WebCrypto-based security utilities (compatible with Cloudflare Workers, Node 18+, and browsers)
 * Zero Node-only dependencies.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Computes SHA-256 hash returned as lowercase hex string
 */
export async function sha256Hex(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Signs message with secret using HMAC-SHA256, returns hex string
 */
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time verification of HMAC-SHA256 signature
 */
export async function verifyHmacSha256(
  key: string,
  message: string,
  expectedHex: string
): Promise<boolean> {
  try {
    const computedHex = await hmacSha256Hex(key, message);
    if (computedHex.length !== expectedHex.length) return false;
    let mismatch = 0;
    for (let i = 0; i < computedHex.length; i++) {
      mismatch |= computedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

/**
 * Generates cryptographically secure random token (e.g. for checkout URLs or API keys)
 */
export function generateSecureToken(prefix = '', byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix ? `${prefix}_${hex}` : hex;
}

/**
 * Encrypts plaintext string using AES-256-GCM with a secret passphrase
 * Returns format: base64(iv + ciphertext + tag)
 */
export async function encryptAesGcm(plainText: string, secretKey: string): Promise<string> {
  // Derive 256-bit key using SHA-256
  const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['encrypt']);

  // 12-byte IV standard for GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  // Return as Base64 string
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts AES-256-GCM base64 string
 */
export async function decryptAesGcm(base64Cipher: string, secretKey: string): Promise<string> {
  const binary = atob(base64Cipher);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt']);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return decoder.decode(decryptedBuffer);
}

export const encryptSecret = encryptAesGcm;
export const decryptSecret = decryptAesGcm;
