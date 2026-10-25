import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import DevicesManager from './DevicesManager';
import { BridgeDevice } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let devices: BridgeDevice[] = [];

  try {
    devices = await db.select<BridgeDevice>('bridge_devices', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });
  } catch (err) {
    console.error('Error fetching bridge devices:', err);
  }

  const workerBaseUrl = process.env.WORKER_BASE_URL || 'https://paisabridge-worker.your-subdomain.workers.dev';

  return <DevicesManager initialDevices={devices} workerBaseUrl={workerBaseUrl} />;
}
