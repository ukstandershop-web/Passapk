import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDb();
    const settings = await db.select<any>('settings', {});
    const settingsMap = settings.reduce((acc: any, s: any) => {
      try {
        acc[s.key] = JSON.parse(s.value_encrypted);
      } catch {
        acc[s.key] = s.value_encrypted;
      }
      return acc;
    }, {});

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, group } = body;

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }

    const db = getDb();
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // Upsert setting
    const existing = await db.selectOne<any>('settings', { filters: { key } });
    if (existing) {
      await db.update('settings', { value_encrypted: valueStr }, { key });
    } else {
      await db.insert('settings', {
        key,
        value_encrypted: valueStr,
        group: group || 'general',
        is_secret: false,
      });
    }

    await db.insert('audit_logs', {
      user_id: session.userId,
      action: 'UPDATE_PLATFORM_SETTING',
      details: JSON.stringify({ key }),
    });

    return NextResponse.json({ success: true, message: 'Setting updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update setting' }, { status: 500 });
  }
}
