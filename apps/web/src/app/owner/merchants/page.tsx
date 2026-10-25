'App'
'use client';

import { useState, useEffect } from 'react';
import { Store, Search, Shield, Ban, CheckCircle, Clock, UserCheck, DollarSign } from 'lucide-react';

export default function OwnerMerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMerchants = () => {
    fetch('/api/owner/merchants')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMerchants(data.merchants);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleStatusChange = async (merchantId: string, status: string) => {
    setActionLoading(merchantId);
    try {
      const res = await fetch('/api/owner/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMerchants();
      } else {
        alert(data.error);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendSub = async (merchantId: string) => {
    setActionLoading(merchantId);
    try {
      const res = await fetch('/api/owner/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, extend_days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMerchants();
      } else {
        alert(data.error);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (merchantId: string) => {
    const res = await fetch(`/api/owner/merchants/${merchantId}/impersonate`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = data.redirect_url;
    } else {
      alert(data.error);
    }
  };

  const filtered = merchants.filter((m) => 
    m.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Merchants Management</h2>
          <p className="text-sm text-slate-400">Oversee registered businesses, subscription statuses, and access controls.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs text-slate-400 uppercase">
                <th className="p-4">Business & Owner</th>
                <th className="p-4">Plan & Status</th>
                <th className="p-4">Subscription Expiry</th>
                <th className="p-4">Balance (PKR)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading merchants...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No merchants found.</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/50">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200">{m.business_name}</div>
                      <div className="text-xs text-slate-400">{m.owner_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          m.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          m.status === 'suspended' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {m.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400 uppercase bg-slate-800 px-2 py-0.5 rounded">{m.plan_id}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {m.subscription_expires_at ? new Date(m.subscription_expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4 font-mono font-medium text-emerald-400">
                      Rs. {Number(m.balance || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleImpersonate(m.id)}
                        className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded text-xs border border-indigo-500/30 font-medium transition-colors"
                        title="Sign in as this merchant"
                      >
                        Impersonate
                      </button>
                      <button
                        onClick={() => handleExtendSub(m.id)}
                        disabled={actionLoading === m.id}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-xs border border-emerald-500/30 font-medium transition-colors"
                      >
                        +30 Days
                      </button>
                      {m.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(m.id, 'suspended')}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded text-xs border border-amber-500/30 font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(m.id, 'active')}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded text-xs border border-emerald-500/30 font-medium"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
