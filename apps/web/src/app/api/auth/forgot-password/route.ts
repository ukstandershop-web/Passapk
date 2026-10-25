import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateSecureToken, sha256Hex, User } from '@paisabridge/shared';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();

    const user = await db.selectOne<User>('users', {
      filters: { email: cleanEmail },
    });

    // To prevent email enumeration, return success even if user not found
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
    }

    // Generate reset token valid for 60 minutes
    const rawToken = generateSecureToken('rst', 32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.insert('password_resets', {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    await db.insert('auth_logs', {
      user_id: user.id,
      email: cleanEmail,
      action: 'password_reset_request',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    const resetUrl = `/reset-password/${rawToken}`;

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      // Provided in response for seamless development & verification
      dev_reset_link: resetUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Forgot password failed' }, 500);
  }
}
