import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { MerchantAlerts } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    let alerts = await db.selectOne<MerchantAlerts>('merchant_alerts', {
      merchant_id: session.merchantId,
    });

    if (!alerts) {
      alerts = {
        merchant_id: session.merchantId,
        email_on_payment: true,
        email_on_offline: true,
        telegram_on_payment: false,
        telegram_on_offline: false,
        telegram_chat_id: '',
      };
    }

    return NextResponse.json({ success: true, alerts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch alert settings' }, { status: 500 });
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
      email_on_payment,
      email_on_offline,
      telegram_on_payment,
      telegram_on_offline,
      telegram_chat_id,
    } = body;

    const db = getDb();
    const existing = await db.selectOne<MerchantAlerts>('merchant_alerts', {
      merchant_id: session.merchantId,
    });

    const payload = {
      merchant_id: session.merchantId,
      email_on_payment: !!email_on_payment,
      email_on_offline: !!email_on_offline,
      telegram_on_payment: !!telegram_on_payment,
      telegram_on_offline: !!telegram_on_offline,
      telegram_chat_id: telegram_chat_id?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      result = await db.update<MerchantAlerts>(
        'merchant_alerts',
        { merchant_id: session.merchantId },
        payload
      );
    } else {
      result = await db.insert<MerchantAlerts>('merchant_alerts', payload);
    }

    return NextResponse.json({ success: true, alerts: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save alert settings' }, { status: 500 });
  }
}
