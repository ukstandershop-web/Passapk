import { UserSession, AuthTokens } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Signs a JWT with HMAC-SHA256
 */
export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataToSign));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureBinary = String.fromCharCode(...signatureArray);
  const signatureB64 = base64UrlEncode(signatureBinary);

  return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies a JWT and checks expiration
 */
export async function verifyJwt<T = Record<string, unknown>>(
  token: string,
  secret: string
): Promise<T | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToVerify = `${headerB64}.${payloadB64}`;

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySig = base64UrlDecode(signatureB64);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson) as T & { exp?: number };

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates both access token (15 mins) and refresh token (7 days) for a user session
 */
export async function createAuthTokens(
  session: UserSession,
  jwtSecret: string
): Promise<AuthTokens> {
  const accessLifetime = 15 * 60; // 15 minutes
  const refreshLifetime = 7 * 24 * 60 * 60; // 7 days

  const accessToken = await signJwt(
    {
      sub: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      merchantId: session.merchantId,
      tokenVersion: session.tokenVersion,
      permissions: session.permissions,
      isImpersonating: session.isImpersonating,
      realOwnerId: session.realOwnerId,
      type: 'access',
    },
    jwtSecret,
    accessLifetime
  );

  const refreshToken = await signJwt(
    {
      sub: session.userId,
      tokenVersion: session.tokenVersion,
      type: 'refresh',
    },
    jwtSecret,
    refreshLifetime
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: accessLifetime,
  };
}
