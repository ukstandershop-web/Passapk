import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { User } from '@paisabridge/shared';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();

    // Increment user token_version to invalidate all existing JWTs across all devices
    const user = await db.selectOne<User>('users', {
      columns: ['token_version'],
      filters: { id: session.userId },
    });

    const newVersion = (user?.token_version || 1) + 1;

    await db.update(
      'users',
      { id: session.userId },
      { token_version: newVersion, updated_at: new Date().toISOString() }
    );

    // Audit log
    await db.insert('auth_logs', {
      user_id: session.userId,
      email: session.email,
      action: 'logout_all_devices',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    // Clear current cookies
    const response = NextResponse.json({
      success: true,
      message: 'All device sessions have been revoked.',
    });

    response.cookies.set('pb_access_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('pb_refresh_token', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout-all failed' }, 500);
  }
}
