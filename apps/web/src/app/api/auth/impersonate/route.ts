import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { createAuthTokens, User } from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owners can impersonate merchants' }, { status: 403 });
    }

    const body = await request.json();
    const { merchant_id } = body;

    if (!merchant_id) {
      return NextResponse.json({ error: 'merchant_id is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify merchant
    const merchant = await db.selectOne<any>('merchants', {
      filters: { id: merchant_id },
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Find primary user for merchant
    const merchantUser = await db.selectOne<User>('users', {
      filters: { merchant_id, role: 'merchant' },
    });

    const targetUserId = merchantUser?.id || merchant.id;
    const targetEmail = merchantUser?.email || merchant.email;
    const targetName = merchantUser?.name || merchant.business_name;

    // Create Impersonation Session
    const impersonationSession = {
      userId: targetUserId,
      email: targetEmail,
      name: `${targetName} [Impersonated]`,
      role: 'merchant' as const,
      merchantId: merchant.id,
      tokenVersion: merchantUser?.token_version || 1,
      isImpersonating: true,
      realOwnerId: session.userId,
    };

    const tokens = await createAuthTokens(impersonationSession, JWT_SECRET);

    // Audit log
    await db.insert('auth_logs', {
      user_id: session.userId,
      email: session.email,
      action: 'impersonation_start',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
      metadata: { target_merchant_id: merchant.id, target_business_name: merchant.business_name },
    });

    const response = NextResponse.json({
      success: true,
      message: `Impersonating ${merchant.business_name}`,
      merchant: { id: merchant.id, business_name: merchant.business_name },
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
    return NextResponse.json({ error: err.message || 'Impersonation failed' }, { status: 500 });
  }
}
