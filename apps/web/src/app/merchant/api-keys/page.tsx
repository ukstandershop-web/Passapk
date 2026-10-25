import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import ApiKeysManager from './ApiKeysManager';
import { MerchantApiKey } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let keys: MerchantApiKey[] = [];

  try {
    keys = await db.select<MerchantApiKey>('merchant_api_keys', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });
  } catch (err) {
    console.error('Error fetching merchant API keys:', err);
  }

  return <ApiKeysManager initialKeys={keys} />;
}
