import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { createAuthTokens, User } from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isImpersonating || !session.realOwnerId) {
      return NextResponse.json({ error: 'No active impersonation session found' }, { status: 400 });
    }

    const db = getDb();

    // Fetch original owner user
    const ownerUser = await db.selectOne<User>('users', {
      filters: { id: session.realOwnerId, role: 'owner' },
    });

    if (!ownerUser) {
      return NextResponse.json({ error: 'Owner record not found' }, { status: 404 });
    }

    // Restore owner session
    const ownerSession = {
      userId: ownerUser.id,
      email: ownerUser.email,
      name: ownerUser.name,
      role: 'owner' as const,
      tokenVersion: ownerUser.token_version,
      isImpersonating: false,
    };

    const tokens = await createAuthTokens(ownerSession, JWT_SECRET);

    // Audit log
    await db.insert('auth_logs', {
      user_id: ownerUser.id,
      email: ownerUser.email,
      action: 'impersonation_end',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
      metadata: { previous_impersonated_id: session.merchantId },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Exited impersonation. Restored administrator session.',
    });

    response.cookies.set('pb_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    response.cookies.set('pb_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to exit impersonation' }, { status: 500 });
  }
}
