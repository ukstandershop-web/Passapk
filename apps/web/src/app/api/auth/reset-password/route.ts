import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sha256Hex, hashPassword, User } from '@paisabridge/shared';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const db = getDb();
    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();

    // Verify token validity
    const resetRecord = await db.selectOne<any>('password_resets', {
      filters: { token_hash: tokenHash },
    });

    if (!resetRecord || resetRecord.used_at || resetRecord.expires_at < nowIso) {
      return NextResponse.json({ error: 'Password reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(new_password);

    // Fetch user and increment token_version (revokes all other active sessions)
    const user = await db.selectOne<User>('users', {
      filters: { id: resetRecord.user_id },
    });

    const newVersion = (user?.token_version || 1) + 1;

    await db.update(
      'users',
      { id: resetRecord.user_id },
      {
        password_hash: passwordHash,
        token_version: newVersion,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: nowIso,
      }
    );

    // Mark reset record used
    await db.update(
      'password_resets',
      { id: resetRecord.id },
      { used_at: nowIso }
    );

    // Log event
    await db.insert('auth_logs', {
      user_id: resetRecord.user_id,
      email: user?.email,
      action: 'password_reset_complete',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Reset password failed' }, { status: 500 });
  }
}
