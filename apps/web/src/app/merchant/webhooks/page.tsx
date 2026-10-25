import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import WebhooksManager from './WebhooksManager';
import { Merchant, WebhookJob } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function WebhooksPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let merchant: Merchant | null = null;
  let logs: WebhookJob[] = [];

  try {
    merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    logs = await db.select<WebhookJob>('webhook_jobs', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
      limit: 50,
    });
  } catch (err) {
    console.error('Error fetching webhooks data:', err);
  }

  return (
    <WebhooksManager
      initialUrl={merchant?.webhook_url || ''}
      initialSecret={merchant?.webhook_secret || ''}
      initialLogs={logs}
    />
  );
}
