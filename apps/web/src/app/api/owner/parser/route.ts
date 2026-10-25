import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { extractPaymentFromText } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDb();
    const rules = await db.select<any>('parser_rules', {
      order: { column: 'priority', ascending: true },
    });

    return NextResponse.json({ success: true, rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch parser rules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, sample_text, provider, sender_pattern, body_regex, is_active, rule_id } = body;

    const db = getDb();

    if (action === 'test') {
      // Live test using shared extractPaymentFromText
      const extracted = extractPaymentFromText(sample_text || '', provider || 'jazzcash');
      return NextResponse.json({ success: true, extracted });
    }

    if (action === 'save') {
      if (!provider || !body_regex) {
        return NextResponse.json({ error: 'Provider and regex are required' }, { status: 400 });
      }

      if (rule_id) {
        const updated = await db.update('parser_rules', {
          provider,
          sender_pattern: sender_pattern || '',
          body_regex,
          is_active: is_active !== undefined ? is_active : true,
        }, { id: rule_id });
        return NextResponse.json({ success: true, rule: updated });
      } else {
        const created = await db.insert('parser_rules', {
          provider,
          sender_pattern: sender_pattern || '',
          body_regex,
          is_active: is_active !== undefined ? is_active : true,
          priority: 10,
        });
        return NextResponse.json({ success: true, rule: created });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Parser operation failed' }, { status: 500 });
  }
}
