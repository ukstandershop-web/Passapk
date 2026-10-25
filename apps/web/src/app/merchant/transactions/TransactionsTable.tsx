'use client';

import React, { useState } from 'react';
import { Transaction, TransactionStatus } from '@paisabridge/shared';

interface TransactionsTableProps {
  initialTransactions: Transaction[];
}

export default function TransactionsTable({ initialTransactions }: TransactionsTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [drawerDetails, setDrawerDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilters = ['ALL', 'PENDING', 'PAID', 'EXPIRED', 'FLAGGED', 'REFUNDED', 'CANCELLED'];

  const filteredTransactions = transactions.filter((t) => {
    const matchesTab = activeTab === 'ALL' || t.status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.order_id?.toLowerCase().includes(q) ||
      t.sms_ref_code?.toLowerCase().includes(q) ||
      t.customer_phone?.toLowerCase().includes(q) ||
      t.customer_name?.toLowerCase().includes(q) ||
      t.sender_phone?.toLowerCase().includes(q) ||
      t.total_amount.toString().includes(q);
    return matchesTab && matchesSearch;
  });

  const openDrawer = async (txn: Transaction) => {
    setSelectedTxn(txn);
    setIsLoadingDetails(true);
    setDrawerDetails(null);

    try {
      const res = await fetch(`/api/merchant/transactions/${txn.id}`);
      const data = await res.json();
      if (data.success) {
        setDrawerDetails(data);
      }
    } catch (e) {
      console.error('Failed to load transaction details', e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const updateStatus = async (status: TransactionStatus, refundNote?: string) => {
    if (!selectedTxn) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/merchant/transactions/${selectedTxn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, refund_note: refundNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setTransactions(transactions.map((t) => (t.id === selectedTxn.id ? data.transaction : t)));
      setSelectedTxn(data.transaction);
      alert(`Transaction status changed to ${status}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'Transaction ID',
      'Order ID',
      'Base Amount (PKR)',
      'Decimal Offset',
      'Total Amount (PKR)',
      'Status',
      'TID / Reference',
      'Sender Phone',
      'Customer Name',
      'Customer Phone',
      'Paid At',
      'Created At',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.order_id,
      t.base_amount,
      t.decimal_offset,
      t.total_amount,
      t.status,
      t.sms_ref_code || '',
      t.sender_phone || '',
      t.customer_name || '',
      t.customer_phone || '',
      t.paid_at || '',
      t.created_at,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paisabridge_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
      case 'EXPIRED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'FLAGGED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'REFUNDED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit trail of all checkout intents, decimal matches, and raw SMS confirmations.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filteredTransactions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-lg text-sm font-semibold shadow-xs transition"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV ({filteredTransactions.length})
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 sm:border-0">
          {statusFilters.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search Order ID, TID, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Expected Exact Amount</th>
                  <th className="px-6 py-3.5">SMS TID / Sender</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openDrawer(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{t.order_id}</div>
                      <code className="text-[11px] text-slate-400 font-mono">
                        {t.id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        PKR {t.total_amount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Base: {t.base_amount} + Offset: {t.decimal_offset.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.sms_ref_code ? (
                        <div>
                          <code className="text-xs font-mono font-semibold text-slate-800">
                            {t.sms_ref_code}
                          </code>
                          <div className="text-[11px] text-slate-500">
                            {t.sender_phone || 'Unknown Sender'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Awaiting SMS</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-800 font-medium">
                        {t.customer_name || 'Guest'}
                      </div>
                      <div className="text-slate-400">{t.customer_phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[11px] text-slate-400">{new Date(t.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                        View &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border mb-1.5 ${getStatusBadge(
                      selectedTxn.status
                    )}`}
                  >
                    {selectedTxn.status}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">Order: {selectedTxn.order_id}</h2>
                </div>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6">
                {/* Amount Box */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-emerald-800 font-medium">Exact Expected Amount</span>
                    <div className="text-2xl font-black text-emerald-900">
                      PKR {selectedTxn.total_amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-emerald-700">
                    <div>Base: PKR {selectedTxn.base_amount}</div>
                    <div className="font-mono text-emerald-800 font-semibold">
                      +{selectedTxn.decimal_offset.toFixed(2)} offset
                    </div>
                  </div>
                </div>

                {/* Audit Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Payment Timeline
                  </h3>
                  <div className="border-l-2 border-slate-200 ml-2 space-y-4 text-xs">
                    <div className="relative pl-4">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute -left-[5px] top-1" />
                      <div className="font-semibold text-slate-800">Checkout Session Created</div>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(selectedTxn.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="relative pl-4">
                      <div
                        className={`w-2.5 h-2.5 rounded-full absolute -left-[5px] top-1 ${
                          selectedTxn.paid_at ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <div className="font-semibold text-slate-800">
                        {selectedTxn.paid_at ? 'SMS Notification Matched' : 'Awaiting SMS'}
                      </div>
                      {selectedTxn.paid_at && (
                        <div className="text-slate-400 text-[11px]">
                          {new Date(selectedTxn.paid_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="relative pl-4">
                      <div
                        className={`w-2.5 h-2.5 rounded-full absolute -left-[5px] top-1 ${
                          selectedTxn.status === 'PAID' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <div className="font-semibold text-slate-800">Webhook Notification</div>
                      <div className="text-slate-400 text-[11px]">
                        {selectedTxn.status === 'PAID' ? 'Queued / Dispatched' : 'Pending payment'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Notification Card */}
                {drawerDetails?.raw_notification && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Matched Bank SMS</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {drawerDetails.raw_notification.package_name.split('.').pop()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200/60 font-mono">
                      &quot;{drawerDetails.raw_notification.content}&quot;
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>TID: {drawerDetails.raw_notification.extracted_tid || '—'}</span>
                      <span>From: {drawerDetails.raw_notification.extracted_sender || '—'}</span>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Token</span>
                    <code className="text-slate-800 font-mono text-[11px]">{selectedTxn.token}</code>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Account Method</span>
                    <span className="font-semibold uppercase text-slate-800">
                      {drawerDetails?.account?.method || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Account Number</span>
                    <span className="font-mono text-slate-800">
                      {drawerDetails?.account?.account_number || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Session Expires At</span>
                    <span className="text-slate-800">
                      {new Date(selectedTxn.expires_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50/50 space-y-2">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                Manual Actions
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus('FLAGGED')}
                  disabled={actionLoading}
                  className="py-2 px-3 text-xs font-semibold rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition"
                >
                  Flag Payment
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter refund reason:');
                    if (reason !== null) updateStatus('REFUNDED', reason);
                  }}
                  disabled={actionLoading}
                  className="py-2 px-3 text-xs font-semibold rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
                >
                  Mark Refunded
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
