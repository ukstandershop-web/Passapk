import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;
    const body = await request.json();

    const db = getDb();
    const updated = await db.update(
      'payment_accounts',
      { id: accountId, merchant_id: session.merchantId },
      {
        ...body,
        updated_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({ success: true, account: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;
    const db = getDb();

    await db.delete('payment_accounts', {
      id: accountId,
      merchant_id: session.merchantId,
    });

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
