import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { RawNotification, Transaction, WebhookJob, Merchant } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    // Fetch notifications where matched_transaction_id IS NULL and is_financial IS TRUE
    const notifications = await db.select<RawNotification>('raw_notifications', {
      filters: { merchant_id: session.merchantId, is_financial: true },
      order: { column: 'created_at', ascending: false },
      limit: 100,
    });

    const unmatched = notifications.filter((n) => !n.matched_transaction_id);

    return NextResponse.json({ success: true, notifications: unmatched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch unmatched notifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notification_id, transaction_id, refund_note } = body;

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id is required' }, { status: 400 });
    }

    const db = getDb();
    const rawNotif = await db.selectOne<RawNotification>('raw_notifications', {
      id: notification_id,
      merchant_id: session.merchantId,
    });

    if (!rawNotif) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (action === 'assign') {
      if (!transaction_id) {
        return NextResponse.json({ error: 'transaction_id is required for assignment' }, { status: 400 });
      }

      const txn = await db.selectOne<Transaction>('transactions', {
        id: transaction_id,
        merchant_id: session.merchantId,
      });

      if (!txn) {
        return NextResponse.json({ error: 'Target transaction not found' }, { status: 404 });
      }

      // Mark transaction as PAID
      const updatedTxn = await db.update<Transaction>(
        'transactions',
        { id: transaction_id, merchant_id: session.merchantId },
        {
          status: 'PAID',
          sms_ref_code: rawNotif.extracted_tid || txn.sms_ref_code,
          sender_phone: rawNotif.extracted_sender || txn.sender_phone,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      // Link raw notification
      await db.update<RawNotification>(
        'raw_notifications',
        { id: notification_id, merchant_id: session.merchantId },
        { matched_transaction_id: transaction_id }
      );

      // Enqueue webhook for payment.paid if merchant has webhook configured
      const merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
      if (merchant && merchant.webhook_url) {
        await db.insert<WebhookJob>('webhook_jobs', {
          merchant_id: session.merchantId,
          transaction_id: transaction_id,
          event: 'payment.paid',
          payload: {
            event: 'payment.paid',
            data: {
              id: updatedTxn.id,
              order_id: updatedTxn.order_id,
              amount: updatedTxn.total_amount,
              currency: updatedTxn.currency,
              status: 'PAID',
              sms_ref_code: updatedTxn.sms_ref_code,
              sender_phone: updatedTxn.sender_phone,
              paid_at: updatedTxn.paid_at,
              manually_approved: true,
            },
            timestamp: Math.floor(Date.now() / 1000),
          },
          target_url: merchant.webhook_url,
          secret: merchant.webhook_secret,
          status: 'queued',
          attempt_count: 0,
          max_attempts: 5,
          next_retry_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Notification matched, payment marked as PAID, and webhook dispatched',
        transaction: updatedTxn,
      });
    } else if (action === 'dismiss' || action === 'reject') {
      // Mark as non-financial to remove from unmatched queue
      await db.update<RawNotification>(
        'raw_notifications',
        { id: notification_id, merchant_id: session.merchantId },
        { is_financial: false }
      );

      return NextResponse.json({ success: true, message: 'Notification dismissed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
