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
    const merchants = await db.select<any>('merchants', {
      order: { column: 'created_at', ascending: false },
    });

    // Also fetch associated user info for each merchant
    const users = await db.select<any>('users', {});
    const merchantsWithUsers = merchants.map((m: any) => {
      const ownerUser = users.find((u: any) => u.merchant_id === m.id);
      return {
        ...m,
        owner_email: ownerUser?.email || 'N/A',
        owner_name: ownerUser?.name || 'N/A',
      };
    });

    return NextResponse.json({ success: true, merchants: merchantsWithUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch merchants' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { merchant_id, status, plan_id, extend_days, ledger_adjustment } = body;

    if (!merchant_id) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 });
    }

    const db = getDb();
    const updates: any = {};
    if (status) updates.status = status;
    if (plan_id) updates.plan_id = plan_id;

    if (extend_days) {
      const current = await db.selectOne<any>('merchants', { filters: { id: merchant_id } });
      const currentExpiry = current?.subscription_expires_at ? new Date(current.subscription_expires_at) : new Date();
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + Number(extend_days) * 86400000);
      updates.subscription_expires_at = newExpiry.toISOString();
    }

    if (ledger_adjustment !== undefined) {
      const current = await db.selectOne<any>('merchants', { filters: { id: merchant_id } });
      updates.balance = Number(current?.balance || 0) + Number(ledger_adjustment);
    }

    const updated = await db.update<any>('merchants', updates, { id: merchant_id });

    // Write audit log
    await db.insert('audit_logs', {
      user_id: session.userId,
      action: 'UPDATE_MERCHANT',
      details: JSON.stringify({ merchant_id, updates }),
    });

    return NextResponse.json({ success: true, merchant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update merchant' }, { status: 500 });
  }
}
