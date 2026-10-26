import { cookies } from 'next/headers';
import { verifyJwt, createAuthTokens, UserSession, User, StaffPermissions } from '@paisabridge/shared';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export interface ExtendedSession extends UserSession {
  status?: string;
}

/**
 * Retrieves and validates the current user session from httpOnly cookies.
 * Handles token_version validation and merchant status check.
 */
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('pb_access_token')?.value;
    const refreshToken = cookieStore.get('pb_refresh_token')?.value;

    if (!accessToken && !refreshToken) {
      return null;
    }

  // 1. Try validating access token first
  if (accessToken) {
    const payload = await verifyJwt<any>(accessToken, JWT_SECRET);
    if (payload && payload.type === 'access') {
      return {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        merchantId: payload.merchantId,
        tokenVersion: payload.tokenVersion,
        permissions: payload.permissions,
        isImpersonating: payload.isImpersonating,
        realOwnerId: payload.realOwnerId,
      };
    }
  }

  // 2. Access token expired or missing, try refresh token
  if (!refreshToken) {
    return null;
  }

  const refreshPayload = await verifyJwt<any>(refreshToken, JWT_SECRET);
  if (!refreshPayload || refreshPayload.type !== 'refresh') {
    return null;
  }

  // Verify against database for token_version match and status
  const db = getDb();
  const user = await db.selectOne<User>('users', {
    filters: { id: refreshPayload.sub },
  });

  if (!user || user.token_version !== refreshPayload.tokenVersion) {
    return null;
  }

  // If user is a merchant, verify they are not suspended or banned
  if (user.merchant_id) {
    const merchant = await db.selectOne<any>('merchants', {
      columns: ['status', 'is_active'],
      filters: { id: user.merchant_id },
    });
    if (merchant && (merchant.status === 'banned' || merchant.status === 'suspended' || !merchant.is_active)) {
      return null;
    }
  }

  // Fetch staff permissions if role is merchant_staff
  let permissions: StaffPermissions | undefined;
  if (user.role === 'merchant_staff') {
    const perms = await db.selectOne<StaffPermissions>('staff_permissions', {
      filters: { user_id: user.id },
    });
    if (perms) permissions = perms;
  }

  const session: ExtendedSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    merchantId: user.merchant_id,
    tokenVersion: user.token_version,
    permissions,
  };

  return session;
  } catch (err) {
    return null;
  }
}
