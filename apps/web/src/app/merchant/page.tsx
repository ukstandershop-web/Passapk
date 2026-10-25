import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { Transaction, BridgeDevice, Merchant } from '@paisabridge/shared';
import Link from 'next/link';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Smartphone,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MerchantDashboard() {
  const session = await getSession();
  const db = getDb();
  const merchantId = session?.merchantId;

  let todayVolume = 0;
  let weekVolume = 0;
  let monthVolume = 0;
  let successCount = 0;
  let totalCount = 0;
  let pendingCount = 0;
  let flaggedCount = 0;

  let bridgeDevice: BridgeDevice | null = null;
  let isBridgeOnline = false;
  let merchant: Merchant | null = null;

  // 7-day chart buckets (Day name and volume)
  const chartDays: Array<{ dateStr: string; label: string; volume: number; count: number }> = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    chartDays.push({ dateStr, label, volume: 0, count: 0 });
  }

  if (merchantId) {
    try {
      merchant = await db.selectOne<Merchant>('merchants', {
        filters: { id: merchantId },
      });

      // Query transactions for metrics
      const txs = await db.select<Transaction>('transactions', {
        columns: ['total_amount', 'status', 'created_at', 'paid_at'],
        filters: { merchant_id: merchantId },
        order: { column: 'created_at', ascending: false },
        limit: 1000,
      });

      const todayStr = now.toISOString().split('T')[0];
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      for (const t of txs) {
        totalCount++;
        const amt = Number(t.total_amount);
        const createdMs = new Date(t.created_at).getTime();
        const dateStr = t.created_at.split('T')[0];

        if (t.status === 'PAID') {
          successCount++;
          if (dateStr === todayStr) todayVolume += amt;
          if (createdMs >= sevenDaysAgo) weekVolume += amt;
          if (createdMs >= thirtyDaysAgo) monthVolume += amt;

          // Add to chart bucket
          const bucket = chartDays.find((b) => b.dateStr === dateStr);
          if (bucket) {
            bucket.volume += amt;
            bucket.count += 1;
          }
        } else if (t.status === 'PENDING') {
          pendingCount++;
        }
      }

      // Check Bridge Device
      bridgeDevice = await db.selectOne<BridgeDevice>('bridge_devices', {
        filters: { merchant_id: merchantId, is_active: true },
        order: { column: 'last_heartbeat_at', ascending: false },
      });

      if (bridgeDevice?.last_heartbeat_at) {
        const lastHb = new Date(bridgeDevice.last_heartbeat_at).getTime();
        isBridgeOnline = Date.now() - lastHb < 5 * 60 * 1000;
      }

      // Check unmatched / flagged count
      flaggedCount = await db.count('raw_notifications', {
        merchant_id: merchantId,
        matched_transaction_id: null,
        is_financial: true,
      });
    } catch (err) {
      console.error('Failed to load merchant metrics:', err);
    }
  }

  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;
  const maxDayVolume = Math.max(...chartDays.map((d) => d.volume), 1000);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Welcome, {merchant?.business_name || session?.name}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time automated payment matching and telemetry overview
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/merchant/accounts"
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-2"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Accounts</span>
          </Link>
          <Link
            href="/merchant/docs"
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center space-x-2 shadow-lg shadow-emerald-600/20"
          >
            <Zap className="w-4 h-4" />
            <span>API Docs & Sandbox</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Today's Volume</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">PKR {todayVolume.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Week: PKR {weekVolume.toLocaleString()}</div>
        </div>

        {/* Success Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Match Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{successRate}%</div>
          <div className="text-[11px] text-emerald-400 mt-1">{successCount} verified payments</div>
        </div>

        {/* Pending Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active decimal slots assigned</div>
        </div>

        {/* Flagged / Unmatched Payments */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Flagged / Unmatched</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{flaggedCount}</div>
          <Link
            href="/merchant/flagged"
            className="text-[11px] text-red-400 hover:underline flex items-center space-x-1 mt-1"
          >
            <span>Review unassigned SMS</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Two Column Layout: Chart & Telemetry Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend Chart (2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-white text-sm">7-Day Payment Volume (PKR)</h3>
              <p className="text-xs text-slate-400">Total volume verified via Bridge App</p>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Auto-Cached
            </span>
          </div>

          {/* Lightweight SVG Bar Chart */}
          <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-800">
            {chartDays.map((day) => {
              const heightPercent = Math.max(8, Math.round((day.volume / maxDayVolume) * 100));
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-800 text-white px-2 py-1 rounded-lg border border-slate-700 shadow-md mb-2 whitespace-nowrap pointer-events-none">
                    PKR {day.volume.toLocaleString()} ({day.count} txns)
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-emerald-600 group-hover:bg-emerald-500 rounded-t-lg transition-all duration-300"
                  />
                  <span className="text-[11px] text-slate-400 mt-2 font-medium">{day.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-2">
            <span>Last 30-Day Volume: PKR {monthVolume.toLocaleString()}</span>
            <span>Rolling 7 Days</span>
          </div>
        </div>

        {/* Bridge Telemetry & Plan Status (1 column) */}
        <div className="space-y-6">
          {/* Bridge Telemetry Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Bridge Phone</h3>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                  isBridgeOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {isBridgeOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {bridgeDevice ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Device Name:</span>
                  <span className="font-semibold text-white">{bridgeDevice.device_name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Battery Level:</span>
                  <span className="font-semibold text-emerald-400">
                    {bridgeDevice.battery_level}% {bridgeDevice.is_charging && '⚡ Charging'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">App Version:</span>
                  <span className="font-mono text-slate-300">{bridgeDevice.app_version || '1.0.0'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Last Heartbeat:</span>
                  <span className="text-slate-300">
                    {bridgeDevice.last_heartbeat_at
                      ? new Date(bridgeDevice.last_heartbeat_at).toLocaleTimeString()
                      : 'Never'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 mb-3">No Android phone paired yet.</p>
                <Link
                  href="/merchant/devices"
                  className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline"
                >
                  <span>Pair Bridge Phone</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Subscription Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Plan Status</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {merchant?.tier || 'Standard'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Account Status:</span>
                <span className="text-white capitalize">{merchant?.is_active ? 'Active' : 'Suspended'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monthly Limit:</span>
                <span className="text-white">3,000 txns</span>
              </div>
              <div className="pt-2">
                <Link
                  href="/merchant/billing"
                  className="block text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  Manage Subscription
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
