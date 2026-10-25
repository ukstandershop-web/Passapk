'use client';

import React, { useState } from 'react';
import { RawNotification, Transaction } from '@paisabridge/shared';

interface FlaggedPaymentsProps {
  initialNotifications: RawNotification[];
  pendingTransactions: Transaction[];
}

export default function FlaggedPaymentsManager({
  initialNotifications,
  pendingTransactions,
}: FlaggedPaymentsProps) {
  const [notifications, setNotifications] = useState<RawNotification[]>(initialNotifications);
  const [assignModalNotif, setAssignModalNotif] = useState<RawNotification | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalNotif || !selectedTxnId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/merchant/notifications/unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          notification_id: assignModalNotif.id,
          transaction_id: selectedTxnId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign payment');

      alert('Payment matched! Order marked as PAID and webhook dispatched.');
      setNotifications(notifications.filter((n) => n.id !== assignModalNotif.id));
      setAssignModalNotif(null);
      setSelectedTxnId('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async (id: string) => {
    if (!confirm('Dismiss this notification? It will be removed from your unmatched inbox.')) {
      return;
    }

    try {
      const res = await fetch('/api/merchant/notifications/unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', notification_id: id }),
      });
      if (!res.ok) throw new Error('Failed to dismiss');
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Flagged &amp; Unmatched Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bank SMS notifications received on Bridge phones that could not be auto-matched to an active order.
          </p>
        </div>
        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
          {notifications.length} Unresolved
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">All Payments Matched Cleanly</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
            There are no orphan bank SMS messages. Every payment received by your Bridge has been auto-matched.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-slate-900">
                      PKR {notif.extracted_amount ? notif.extracted_amount.toFixed(2) : 'Unknown'}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                      {notif.package_name.split('.').pop()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    &quot;{notif.content}&quot;
                  </p>

                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>
                      TID: <strong className="text-slate-800">{notif.extracted_tid || 'N/A'}</strong>
                    </span>
                    <span>
                      Sender: <strong className="text-slate-800">{notif.extracted_sender || 'N/A'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setAssignModalNotif(notif);
                      setSelectedTxnId(pendingTransactions[0]?.id || '');
                    }}
                    className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  >
                    Assign to Order
                  </button>
                  <button
                    onClick={() => handleDismiss(notif.id)}
                    className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assignModalNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Assign Payment to Pending Order</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select which pending checkout order this incoming SMS payment of{' '}
              <strong>PKR {assignModalNotif.extracted_amount?.toFixed(2)}</strong> belongs to.
            </p>

            <form onSubmit={handleAssign} className="mt-5 space-y-4">
              {pendingTransactions.length === 0 ? (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs">
                  No currently pending transactions found. The customer may have paid after order expiry.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Select Target Pending Order
                  </label>
                  <select
                    value={selectedTxnId}
                    onChange={(e) => setSelectedTxnId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {pendingTransactions.map((txn) => (
                      <option key={txn.id} value={txn.id}>
                        {txn.order_id} — Expected: PKR {txn.total_amount.toFixed(2)} (Customer: {txn.customer_name || 'Guest'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignModalNotif(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedTxnId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Matching...' : 'Confirm & Dispatch Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
