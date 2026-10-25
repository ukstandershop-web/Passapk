import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();
    const logs = await db.select<any>('auth_logs', {
      filters: { user_id: session.userId },
      order: { column: 'created_at', ascending: false },
      limit: 20,
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sessions' }, 500);
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();
    const user = await db.selectOne<any>('users', { id: session.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, 404);
    }

    // Invalidate all tokens by incrementing token_version
    await db.update('users', { id: session.userId }, {
      token_version: (user.token_version || 1) + 1,
    });

    return NextResponse.json({ success: true, message: 'Logged out of all devices successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to invalidate sessions' }, 500);
  }
}
