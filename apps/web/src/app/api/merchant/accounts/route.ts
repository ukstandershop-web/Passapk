import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { PaymentAccount } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const accounts = await db.select<PaymentAccount>('payment_accounts', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'priority', ascending: false },
    });

    return NextResponse.json({ success: true, accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      method,
      account_title,
      account_number,
      iban,
      bank_name,
      daily_limit,
      priority,
      instructions_en,
      instructions_ur,
    } = body;

    if (!method || !account_title || !account_number) {
      return NextResponse.json({ error: 'Method, account title, and number are required' }, { status: 400 });
    }

    const db = getDb();
    const newAccount = await db.insert<PaymentAccount>('payment_accounts', {
      merchant_id: session.merchantId,
      method,
      account_title,
      account_number,
      iban: iban || null,
      bank_name: bank_name || null,
      daily_limit: Number(daily_limit) || 500000,
      current_daily_volume: 0,
      priority: Number(priority) || 1,
      is_active: true,
      instructions_en: instructions_en || null,
      instructions_ur: instructions_ur || null,
    });

    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create account' }, { status: 500 });
  }
}
