import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { createAuthTokens } from '@paisabridge/shared';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized - Owner role required' }, { status: 403 });
    }

    const merchantId = params.id;
    const db = getDb();

    // Verify merchant exists
    const merchant = await db.selectOne<any>('merchants', { filters: { id: merchantId } });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Find the primary user for this merchant
    const merchantUser = await db.selectOne<any>('users', { filters: { merchant_id: merchantId } });
    if (!merchantUser) {
      return NextResponse.json({ error: 'No user account found for this merchant' }, { status: 404 });
    }

    // Generate impersonation token
    const tokens = await createAuthTokens(
      {
        userId: merchantUser.id,
        email: merchantUser.email,
        name: merchantUser.name,
        role: 'merchant',
        merchantId: merchantId,
        tokenVersion: merchantUser.token_version || 1,
        isImpersonating: true,
        realOwnerId: session.userId,
      },
      JWT_SECRET
    );

    // Set cookies for merchant session while retaining impersonation flag
    const cookieStore = cookies();
    cookieStore.set({
      name: 'pb_access_token',
      value: tokens.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });
    cookieStore.set({
      name: 'pb_refresh_token',
      value: tokens.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    });

    // Write audit log
    await db.insert('audit_logs', {
      user_id: session.userId,
      action: 'IMPERSONATE_MERCHANT',
      details: JSON.stringify({ owner_id: session.userId, merchant_id: merchantId }),
    });

    return NextResponse.json({ success: true, redirect_url: '/merchant' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to impersonate merchant' }, { status: 500 });
  }
}
