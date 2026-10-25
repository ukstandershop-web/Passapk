import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import AlertsManager from './AlertsManager';
import { MerchantAlerts } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let alerts: MerchantAlerts | null = null;

  try {
    alerts = await db.selectOne<MerchantAlerts>('merchant_alerts', {
      merchant_id: session.merchantId,
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
  }

  return (
    <AlertsManager
      initialAlerts={
        alerts || {
          merchant_id: session.merchantId,
          email_on_payment: true,
          email_on_offline: true,
          telegram_on_payment: false,
          telegram_on_offline: false,
          telegram_chat_id: '',
        }
      }
      merchantEmail={session.email}
    />
  );
}
