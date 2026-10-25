import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDb();
    const proofs = await db.select<any>('billing_proofs', {
      order: { column: 'created_at', ascending: false },
    });

    // Attach merchant names
    const merchants = await db.select<any>('merchants', {});
    const proofsWithMerchant = proofs.map((p: any) => {
      const m = merchants.find((merchant: any) => merchant.id === p.merchant_id);
      return {
        ...p,
        merchant_business_name: m?.business_name || 'Unknown Merchant',
      };
    });

    return NextResponse.json({ success: true, proofs: proofsWithMerchant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch billing proofs' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { proof_id, action, rejection_reason } = body; // action: 'approve' | 'reject'

    if (!proof_id || !action) {
      return NextResponse.json({ error: 'Proof ID and action are required' }, { status: 400 });
    }

    const db = getDb();
    const proof = await db.selectOne<any>('billing_proofs', { filters: { id: proof_id } });
    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Update proof status
      await db.update('billing_proofs', { status: 'approved', reviewed_at: new Date().toISOString() }, { id: proof_id });

      // Auto-activate merchant subscription, advance expiry 30 days
      const merchant = await db.selectOne<any>('merchants', { filters: { id: proof.merchant_id } });
      const currentExpiry = merchant?.subscription_expires_at ? new Date(merchant.subscription_expires_at) : new Date();
      const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 30 * 86400000);

      await db.update('merchants', {
        status: 'active',
        subscription_expires_at: newExpiry.toISOString(),
      }, { id: proof.merchant_id });

      // Audit log
      await db.insert('audit_logs', {
        user_id: session.userId,
        action: 'APPROVE_PAYMENT_PROOF',
        details: JSON.stringify({ proof_id, merchant_id: proof.merchant_id, new_expiry: newExpiry.toISOString() }),
      });

      return NextResponse.json({ success: true, message: 'Proof approved and subscription extended by 30 days' });
    } else if (action === 'reject') {
      await db.update('billing_proofs', {
        status: 'rejected',
        rejection_reason: rejection_reason || 'Invalid payment proof',
        reviewed_at: new Date().toISOString(),
      }, { id: proof_id });

      await db.insert('audit_logs', {
        user_id: session.userId,
        action: 'REJECT_PAYMENT_PROOF',
        details: JSON.stringify({ proof_id, merchant_id: proof.merchant_id, reason: rejection_reason }),
      });

      return NextResponse.json({ success: true, message: 'Proof rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process proof' }, { status: 500 });
  }
}
