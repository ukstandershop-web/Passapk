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
    const setting = await db.selectOne<any>('settings', { filters: { key: 'pricing_plans' } });
    const plans = setting ? JSON.parse(setting.value_encrypted) : [];

    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, activation_fee, monthly_fee, monthly_transaction_limit, per_transaction_fee_percent, per_transaction_fee_fixed, max_pending_orders, features, active } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Plan ID and name are required' }, { status: 400 });
    }

    const db = getDb();
    const setting = await db.selectOne<any>('settings', { filters: { key: 'pricing_plans' } });
    let plans = setting ? JSON.parse(setting.value_encrypted) : [];

    const existingIndex = plans.findIndex((p: any) => p.id === id);
    const newPlan = {
      id,
      name,
      activation_fee: Number(activation_fee) || 0,
      monthly_fee: Number(monthly_fee) || 0,
      monthly_transaction_limit: Number(monthly_transaction_limit) || 1000,
      per_transaction_fee_percent: Number(per_transaction_fee_percent) || 0,
      per_transaction_fee_fixed: Number(per_transaction_fee_fixed) || 0,
      max_pending_orders: Number(max_pending_orders) || 20,
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n') : []),
      active: active !== undefined ? active : true,
    };

    if (existingIndex >= 0) {
      plans[existingIndex] = newPlan;
    } else {
      plans.push(newPlan);
    }

    await db.update('settings', {
      value_encrypted: JSON.stringify(plans),
    }, { key: 'pricing_plans' });

    await db.insert('audit_logs', {
      user_id: session.userId,
      action: 'SAVE_PRICING_PLAN',
      details: JSON.stringify({ plan_id: id }),
    });

    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save plan' }, { status: 500 });
  }
}
