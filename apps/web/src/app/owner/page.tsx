'App'
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Store, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Cpu, 
  FileCheck, 
  Webhook, 
  ArrowUpRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

export default function OwnerOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/owner/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error || 'Failed to load stats');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Loading superadmin overview...</div>;
  }

  if (error) {
    return <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg">{error}</div>;
  }

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Superadmin Dashboard</h2>
        <p className="text-sm text-slate-400">Platform overview, transaction volume, and system health metrics.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Volume Processed</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold">{formatPKR(stats?.total_volume || 0)}</div>
          <div className="text-xs text-emerald-400 font-medium">100% Verified via SMS/Push</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Active Merchants</span>
            <Store className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold">{stats?.active_merchants || 0} <span className="text-sm font-normal text-slate-400">/ {stats?.total_merchants || 0} total</span></div>
          <div className="text-xs text-indigo-400 font-medium">{stats?.suspended_merchants || 0} suspended</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Pending Proofs Queue</span>
            <FileCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold">{stats?.pending_proofs_count || 0}</div>
          <Link href="/owner/proofs" className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium">
            Review pending proofs <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Bridge Devices Online</span>
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold">{stats?.online_devices || 0} <span className="text-sm font-normal text-slate-400">/ {stats?.total_devices || 0}</span></div>
          <div className="text-xs text-cyan-400 font-medium">Active Android bridge nodes</div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Merchant Governance</h3>
              <p className="text-xs text-slate-400">Approve, suspend, ban or impersonate</p>
            </div>
          </div>
          <Link href="/owner/merchants" className="block w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-center rounded-lg text-sm font-medium transition-colors">
            Manage Merchants
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">SMS Parser Rules</h3>
              <p className="text-xs text-slate-400">Manage regex extractors & live tester</p>
            </div>
          </div>
          <Link href="/owner/parser" className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-center rounded-lg text-sm font-medium transition-colors border border-slate-700">
            Configure Parser Rules
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">System Health & Proxy</h3>
              <p className="text-xs text-slate-400">Database latency & Worker status</p>
            </div>
          </div>
          <Link href="/owner/health" className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-center rounded-lg text-sm font-medium transition-colors border border-slate-700">
            View System Health
          </Link>
        </div>
      </div>
    </div>
  );
}
