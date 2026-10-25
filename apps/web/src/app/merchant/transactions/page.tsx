import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import TransactionsTable from './TransactionsTable';
import { Transaction } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let transactions: Transaction[] = [];

  try {
    transactions = await db.select<Transaction>('transactions', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
      limit: 100,
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }

  return <TransactionsTable initialTransactions={transactions} />;
}
