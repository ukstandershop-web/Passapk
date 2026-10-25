'App'
'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, Database, Server, RefreshCw } from 'lucide-react';

export default function OwnerHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = () => {
    setLoading(true);
    fetch('/api/owner/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setHealth(data.health);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health & Proxy Monitor</h2>
          <p className="text-sm text-slate-400">Real-time database roundtrip latency, PostgREST proxy status, and Cloudflare Worker telemetry.</p>
        </div>
        <button
          onClick={checkHealth}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} /> Run Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">PostgreSQL Latency</span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {health ? `${health.database_ping_ms} ms` : '...'}
          </div>
          <p className="text-xs text-slate-400">PostgREST query roundtrip time</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Cloudflare Worker Status</span>
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 uppercase">
            {health?.worker_status || 'Online'}
          </div>
          <p className="text-xs text-slate-400">Webhook and SMS ingest edge worker</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Registered Merchants</span>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold">
            {health?.total_merchants ?? '...'}
          </div>
          <p className="text-xs text-slate-400">Active database records count</p>
        </div>
      </div>
    </div>
  );
}
