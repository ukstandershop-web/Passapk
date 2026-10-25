'App'
'use client';

import { useState, useEffect } from 'react';
import { FileCheck, Check, X, Eye, ExternalLink } from 'lucide-react';

export default function OwnerProofsPage() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<any>(null);

  const fetchProofs = () => {
    fetch('/api/owner/proofs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProofs(data.proofs);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  const handleAction = async (proofId: string, action: 'approve' | 'reject', reason?: string) => {
    const res = await fetch('/api/owner/proofs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof_id: proofId, action, rejection_reason: reason }),
    });
    const data = await res.json();
    if (data.success) {
      setSelectedProof(null);
      fetchProofs();
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subscription Payment Proofs</h2>
        <p className="text-sm text-slate-400">Review manual bank transfer receipts and screenshots submitted by merchants.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs text-slate-400 uppercase">
                <th className="p-4">Merchant</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Reference / TID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading proofs...</td></tr>
              ) : proofs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No payment proofs submitted.</td></tr>
              ) : (
                proofs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-850/50">
                    <td className="p-4 font-semibold text-slate-200">{p.merchant_business_name}</td>
                    <td className="p-4 font-mono font-medium text-emerald-400">Rs. {Number(p.amount || 0).toLocaleString()}</td>
                    <td className="p-4 font-mono text-xs text-slate-300">{p.transaction_reference || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        p.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedProof(p)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 font-medium inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Proof
                      </button>
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(p.id, 'approve')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for rejection:', 'Screenshot unclear or reference mismatch');
                              if (reason) handleAction(p.id, 'reject', reason);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Viewer Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Payment Proof Details</h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Merchant:</span> {selectedProof.merchant_business_name}</p>
              <p><span className="text-slate-400">Amount:</span> Rs. {Number(selectedProof.amount || 0).toLocaleString()}</p>
              <p><span className="text-slate-400">Reference:</span> {selectedProof.transaction_reference}</p>
              <p><span className="text-slate-400">Submitted:</span> {new Date(selectedProof.created_at).toLocaleString()}</p>
            </div>
            {selectedProof.screenshot_url ? (
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 p-2 flex justify-center">
                <img src={selectedProof.screenshot_url} alt="Payment Receipt" className="max-h-80 object-contain rounded" />
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950 text-slate-500 rounded-lg text-sm">No screenshot attached.</div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedProof(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                Close
              </button>
              {selectedProof.status === 'pending' && (
                <button
                  onClick={() => {
                    handleAction(selectedProof.id, 'approve');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
                >
                  Approve & Extend 30 Days
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
