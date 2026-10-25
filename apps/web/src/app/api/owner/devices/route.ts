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
    const devices = await db.select<any>('bridge_devices', {
      order: { column: 'last_heartbeat', ascending: false },
    });

    const merchants = await db.select<any>('merchants', {});
    const devicesWithMerchant = devices.map((d: any) => {
      const m = merchants.find((merchant: any) => merchant.id === d.merchant_id);
      return {
        ...d,
        merchant_business_name: m?.business_name || 'Unknown Merchant',
      };
    });

    return NextResponse.json({ success: true, devices: devicesWithMerchant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bridge devices' }, { status: 500 });
  }
}
