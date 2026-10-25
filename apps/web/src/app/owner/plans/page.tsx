'App'
'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Check } from 'lucide-react';

export default function OwnerPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = () => {
    fetch('/api/owner/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPlans(data.plans);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscription Plans & Pricing CRUD</h2>
        <p className="text-sm text-slate-400">Manage subscription tiers, monthly fees, activation charges, and feature quotas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-slate-400 py-12 text-center">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-3 text-slate-400 py-12 text-center">No plans configured.</div>
        ) : (
          plans.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-indigo-400">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <div className="space-y-1 font-mono">
                  <div className="text-2xl font-bold text-slate-100">Rs. {p.monthly_fee?.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ month</span></div>
                  <div className="text-xs text-slate-400">Activation Fee: Rs. {p.activation_fee?.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Txn Limit: {p.monthly_transaction_limit?.toLocaleString()} / mo</div>
                </div>
                <div className="pt-2 border-t border-slate-800 space-y-1 text-xs text-slate-300">
                  {p.features?.map((f: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
