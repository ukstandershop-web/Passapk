import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized: Merchant session required' }, { status: 401 });
    }

    const body = await request.json();
    const { plan_id, amount_paid, sender_account, payment_method, proof_data_url } = body;

    if (!plan_id || !amount_paid || !sender_account || !payment_method) {
      return NextResponse.json({ error: 'Missing required proof fields' }, { status: 400 });
    }

    const db = getDb();

    // Insert billing proof
    const newProof = await db.insert('billing_proofs', {
      merchant_id: session.merchantId,
      plan_id,
      type: 'activation',
      amount_paid: Number(amount_paid),
      sender_account,
      payment_method,
      proof_data_url: proof_data_url || null,
      status: 'pending',
    });

    // Update merchant subscription_status to pending_activation
    await db.update(
      'merchants',
      { id: session.merchantId },
      {
        plan_id,
        subscription_status: 'pending_activation',
        updated_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Payment proof submitted. Awaiting platform owner review.',
      proof: newProof,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit proof' }, { status: 500 });
  }
}
