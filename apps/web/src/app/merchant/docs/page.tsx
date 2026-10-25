import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import DocsViewer from './DocsViewer';
import { MerchantApiKey } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let sampleApiKey = 'pk_live_your_api_key_here';

  try {
    const keys = await db.select<MerchantApiKey>('merchant_api_keys', {
      filters: { merchant_id: session.merchantId, is_active: true },
      order: { column: 'created_at', ascending: false },
      limit: 1,
    });
    if (keys.length > 0) {
      sampleApiKey = keys[0].public_key;
    }
  } catch (err) {
    console.error('Error fetching sample API key:', err);
  }

  const workerUrl = process.env.WORKER_BASE_URL || 'https://paisabridge-worker.your-subdomain.workers.dev';

  return <DocsViewer workerUrl={workerUrl} sampleApiKey={sampleApiKey} />;
}
