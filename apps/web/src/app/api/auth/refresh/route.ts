import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyJwt, createAuthTokens, User, StaffPermissions } from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function POST() {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('pb_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 });
    }

    const payload = await verifyJwt<any>(refreshToken, JWT_SECRET);
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const db = getDb();
    const user = await db.selectOne<User>('users', {
      filters: { id: payload.sub },
    });

    if (!user || user.token_version !== payload.tokenVersion) {
      return NextResponse.json({ error: 'Session revoked. Please log in again.' }, { status: 401 });
    }

    // Check merchant status if applicable
    if (user.merchant_id) {
      const merchant = await db.selectOne<any>('merchants', {
        columns: ['status', 'is_active'],
        filters: { id: user.merchant_id },
      });
      if (merchant && (merchant.status === 'banned' || merchant.status === 'suspended' || !merchant.is_active)) {
        return NextResponse.json({ error: 'Merchant account is suspended or banned.' }, { status: 403 });
      }
    }

    let permissions: StaffPermissions | undefined;
    if (user.role === 'merchant_staff') {
      const p = await db.selectOne<StaffPermissions>('staff_permissions', {
        filters: { user_id: user.id },
      });
      if (p) permissions = p;
    }

    const session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      merchantId: user.merchant_id,
      tokenVersion: user.token_version,
      permissions,
    };

    const tokens = await createAuthTokens(session, JWT_SECRET);

    const response = NextResponse.json({ success: true, message: 'Session refreshed' });

    response.cookies.set('pb_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Token refresh failed' }, { status: 500 });
  }
}
