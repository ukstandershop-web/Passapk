import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { Transaction } from '@paisabridge/shared';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getDb();
    const filters: Record<string, any> = { merchant_id: session.merchantId };
    if (status && status !== 'ALL') {
      filters.status = status;
    }

    const transactions = await db.select<Transaction>('transactions', {
      filters,
      order: { column: 'created_at', ascending: false },
      limit: Math.min(limit, 200),
    });

    // Client-side search filtering if search query present
    let filtered = transactions;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = transactions.filter(
        (t) =>
          t.order_id?.toLowerCase().includes(q) ||
          t.sms_ref_code?.toLowerCase().includes(q) ||
          t.customer_phone?.toLowerCase().includes(q) ||
          t.customer_name?.toLowerCase().includes(q) ||
          t.sender_phone?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, transactions: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch transactions' }, 500);
  }
}
