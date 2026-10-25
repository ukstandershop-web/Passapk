import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { MerchantSidebar } from '@/components/MerchantSidebar';
import { BridgeDevice, Merchant } from '@paisabridge/shared';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login?redirect=/merchant');
  }

  // Ensure owner or merchant
  if (session.role !== 'merchant' && session.role !== 'merchant_staff' && session.role !== 'owner') {
    redirect('/login');
  }

  const db = getDb();
  let merchantName = session.name;
  let bridgeOnline = false;
  let bridgeBattery: number | undefined;

  const targetMerchantId = session.merchantId;

  if (targetMerchantId) {
    try {
      const merchant = await db.selectOne<Merchant>('merchants', {
        columns: ['business_name', 'status'],
        filters: { id: targetMerchantId },
      });
      if (merchant) {
        merchantName = merchant.business_name;
      }

      // Check bridge status
      const device = await db.selectOne<BridgeDevice>('bridge_devices', {
        columns: ['last_heartbeat_at', 'battery_level', 'is_active'],
        filters: { merchant_id: targetMerchantId, is_active: true },
        order: { column: 'last_heartbeat_at', ascending: false },
      });

      if (device && device.last_heartbeat_at) {
        const lastHb = new Date(device.last_heartbeat_at).getTime();
        const diffMs = Date.now() - lastHb;
        bridgeOnline = diffMs < 5 * 60 * 1000; // Online if pinged within last 5 mins
        bridgeBattery = device.battery_level;
      }
    } catch (err) {
      console.error('Failed to query merchant layout telemetry:', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative">
      {session.isImpersonating && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-center font-semibold text-sm flex items-center justify-center gap-3 shadow-lg">
          <span>⚠️ You are impersonating merchant account ({session.email}).</span>
          <Link href="/owner" className="bg-slate-950 text-amber-400 px-3 py-1 rounded text-xs hover:bg-slate-900">
            Return to Owner Panel
          </Link>
        </div>
      )}
      <MerchantSidebar
        businessName={merchantName}
        email={session.email}
        role={session.role}
        bridgeOnline={bridgeOnline}
        bridgeBattery={bridgeBattery}
      />
      <main className={`flex-1 lg:pl-64 flex flex-col min-h-screen overflow-x-hidden ${session.isImpersonating ? 'pt-12' : ''}`}>
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">{children}</div>
      </main>
    </div>
  );
}
