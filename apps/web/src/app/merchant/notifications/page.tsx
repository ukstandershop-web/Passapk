import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import { RawNotification } from '@paisabridge/shared';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NotificationsInboxPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let notifications: RawNotification[] = [];

  try {
    notifications = await db.select<RawNotification>('raw_notifications', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
      limit: 100,
    });
  } catch (err) {
    console.error('Error fetching raw notifications:', err);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bridge Notifications Stream</h1>
          <p className="text-sm text-slate-500 mt-1">
            Raw incoming SMS and push messages intercepted by your paired Android bridge phones.
          </p>
        </div>
        <Link
          href="/merchant/flagged"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
        >
          View Unmatched ({notifications.filter((n) => !n.matched_transaction_id && n.is_financial).length})
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No notifications intercepted yet. Ensure your Bridge Android app is running.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Package / Source</th>
                  <th className="px-6 py-3.5">Raw SMS Message</th>
                  <th className="px-6 py-3.5">Parsed Amount</th>
                  <th className="px-6 py-3.5">Extracted TID</th>
                  <th className="px-6 py-3.5">Match Status</th>
                  <th className="px-6 py-3.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {notif.package_name.split('.').pop()}
                      </code>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-xs text-slate-700 font-mono line-clamp-2" title={notif.content}>
                        {notif.content}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {notif.extracted_amount ? (
                        <span className="font-bold text-slate-900 text-xs">
                          PKR {notif.extracted_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-700">
                      {notif.extracted_tid || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {notif.matched_transaction_id ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Matched
                        </span>
                      ) : notif.is_financial ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Unmatched
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Non-Financial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(notif.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
