import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { Merchant, BillingProof } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();
    const merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, 404);
    }

    const proofs = await db.select<BillingProof>('billing_proofs', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });

    return NextResponse.json({
      success: true,
      merchant,
      proofs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch billing info' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const body = await request.json();
    const { plan_id, amount_paid, sender_account, payment_method, proof_data_url } = body;

    if (!amount_paid || !sender_account || !payment_method) {
      return NextResponse.json({ error: 'Please fill in all payment details' }, 400);
    }

    const db = getDb();
    const newProof = await db.insert<BillingProof>('billing_proofs', {
      merchant_id: session.merchantId,
      plan_id: plan_id || 'standard',
      type: 'renewal',
      amount_paid: Number(amount_paid),
      sender_account: sender_account.trim(),
      payment_method: payment_method.trim(),
      proof_data_url: proof_data_url || null,
      status: 'pending',
    });

    return NextResponse.json({ success: true, proof: newProof }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit renewal proof' }, 500);
  }
}
