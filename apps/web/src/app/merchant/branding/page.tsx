import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import BrandingManager from './BrandingManager';
import { MerchantBranding, Merchant } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function BrandingPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let branding: MerchantBranding | null = null;
  let merchant: Merchant | null = null;

  try {
    merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    branding = await db.selectOne<MerchantBranding>('merchant_branding', {
      merchant_id: session.merchantId,
    });
  } catch (err) {
    console.error('Error fetching branding data:', err);
  }

  return (
    <BrandingManager
      initialBranding={
        branding || {
          merchant_id: session.merchantId,
          brand_color: '#059669',
          welcome_message: 'Please transfer the exact PKR amount shown below.',
          show_timer: true,
        }
      }
      businessName={merchant?.business_name || 'My Store'}
    />
  );
}
