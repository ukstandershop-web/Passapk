import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import BillingManager from './BillingManager';
import { Merchant, BillingProof } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let merchant: Merchant | null = null;
  let proofs: BillingProof[] = [];
  let platformAccounts: any[] = [];

  try {
    merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    proofs = await db.select<BillingProof>('billing_proofs', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });

    const settingsRow = await db.selectOne<any>('settings', { key: 'platform_accounts' });
    if (settingsRow && settingsRow.value_encrypted) {
      platformAccounts = JSON.parse(settingsRow.value_encrypted);
    }
  } catch (err) {
    console.error('Error fetching billing data:', err);
  }

  if (!merchant) {
    redirect('/login');
  }

  return (
    <BillingManager
      merchant={merchant}
      initialProofs={proofs}
      platformAccounts={platformAccounts}
    />
  );
}
