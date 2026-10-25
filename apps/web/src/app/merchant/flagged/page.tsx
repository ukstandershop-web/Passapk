import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import FlaggedPaymentsManager from './FlaggedPaymentsManager';
import { RawNotification, Transaction } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function FlaggedPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let notifications: RawNotification[] = [];
  let pendingTransactions: Transaction[] = [];

  try {
    const rawList = await db.select<RawNotification>('raw_notifications', {
      filters: { merchant_id: session.merchantId, is_financial: true },
      order: { column: 'created_at', ascending: false },
      limit: 50,
    });
    notifications = rawList.filter((n) => !n.matched_transaction_id);

    pendingTransactions = await db.select<Transaction>('transactions', {
      filters: { merchant_id: session.merchantId, status: 'PENDING' },
      order: { column: 'created_at', ascending: false },
      limit: 50,
    });
  } catch (err) {
    console.error('Error fetching flagged notifications:', err);
  }

  return (
    <FlaggedPaymentsManager
      initialNotifications={notifications}
      pendingTransactions={pendingTransactions}
    />
  );
}
