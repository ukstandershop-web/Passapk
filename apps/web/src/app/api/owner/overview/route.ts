import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized - Owner role required' }, { status: 403 });
    }

    const db = getDb();
    
    // Fetch counts and aggregates
    const merchants = await db.select<any>('merchants', {});
    const transactions = await db.select<any>('transactions', {});
    const proofs = await db.select<any>('billing_proofs', { filters: { status: 'pending' } });
    const devices = await db.select<any>('bridge_devices', {});
    const webhooks = await db.select<any>('webhook_deliveries', { filters: { status: 'failed' } });

    const totalMerchants = merchants.length;
    const activeMerchants = merchants.filter((m: any) => m.status === 'active').length;
    const suspendedMerchants = merchants.filter((m: any) => m.status === 'suspended').length;
    
    const totalTransactions = transactions.length;
    const successTransactions = transactions.filter((t: any) => t.status === 'PAID').length;
    const flaggedTransactions = transactions.filter((t: any) => t.status === 'FLAGGED').length;
    
    const totalVolume = transactions
      .filter((t: any) => t.status === 'PAID')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const onlineDevices = devices.filter((d: any) => d.status === 'online').length;

    return NextResponse.json({
      success: true,
      stats: {
        total_merchants: totalMerchants,
        active_merchants: activeMerchants,
        suspended_merchants: suspendedMerchants,
        total_transactions: totalTransactions,
        success_transactions: successTransactions,
        flagged_transactions: flaggedTransactions,
        total_volume: totalVolume,
        pending_proofs_count: proofs.length,
        failed_webhooks_count: webhooks.length,
        online_devices: onlineDevices,
        total_devices: devices.length,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch owner overview' }, { status: 500 });
  }
}
