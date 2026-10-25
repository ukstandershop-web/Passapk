import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { Transaction, RawNotification, PaymentAccount } from '@paisabridge/shared';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const transactionId = params.id;
    const db = getDb();

    const transaction = await db.selectOne<Transaction>('transactions', {
      id: transactionId,
      merchant_id: session.merchantId,
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, 404);
    }

    // Fetch related payment account
    let account: PaymentAccount | null = null;
    if (transaction.account_id) {
      account = await db.selectOne<PaymentAccount>('payment_accounts', {
        id: transaction.account_id,
      });
    }

    // Fetch matched raw notification
    let rawNotification: RawNotification | null = null;
    const notifications = await db.select<RawNotification>('raw_notifications', {
      filters: { matched_transaction_id: transaction.id },
      limit: 1,
    });
    if (notifications.length > 0) {
      rawNotification = notifications[0];
    }

    return NextResponse.json({
      success: true,
      transaction,
      account,
      raw_notification: rawNotification,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch transaction details' }, 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const transactionId = params.id;
    const body = await request.json();
    const { status, refund_note } = body;

    const db = getDb();
    const existing = await db.selectOne<Transaction>('transactions', {
      id: transactionId,
      merchant_id: session.merchantId,
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, 404);
    }

    const updates: Partial<Transaction> = {};
    if (status) {
      updates.status = status;
    }
    if (refund_note) {
      updates.metadata = { ...(existing.metadata || {}), refund_note };
    }

    const updated = await db.update<Transaction>(
      'transactions',
      { id: transactionId, merchant_id: session.merchantId },
      updates
    );

    return NextResponse.json({ success: true, transaction: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update transaction' }, 500);
  }
}
