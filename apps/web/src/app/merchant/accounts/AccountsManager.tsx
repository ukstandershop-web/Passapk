'use client';

import React, { useState } from 'react';
import { PaymentAccount } from '@paisabridge/shared';
import { CreditCard, Plus, Trash2, Power, AlertCircle, Loader2, Check } from 'lucide-react';

interface AccountsManagerProps {
  initialAccounts: PaymentAccount[];
}

export function AccountsManager({ initialAccounts }: AccountsManagerProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>(initialAccounts);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [method, setMethod] = useState('jazzcash');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [dailyLimit, setDailyLimit] = useState(500000);
  const [priority, setPriority] = useState(1);
  const [instructionsEn, setInstructionsEn] = useState('');
  const [instructionsUr, setInstructionsUr] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/merchant/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          account_title: accountTitle,
          account_number: accountNumber,
          iban,
          bank_name: bankName,
          daily_limit: dailyLimit,
          priority,
          instructions_en: instructionsEn,
          instructions_ur: instructionsUr,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add account');

      setAccounts([data.account, ...accounts]);
      setShowAddModal(false);
      // Reset
      setAccountTitle('');
      setAccountNumber('');
      setIban('');
      setBankName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (account: PaymentAccount) => {
    try {
      const newStatus = !account.is_active;
      const res = await fetch(`/api/merchant/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        setAccounts(accounts.map((a) => (a.id === account.id ? { ...a, is_active: newStatus } : a)));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this payment account?')) return;
    try {
      const res = await fetch(`/api/merchant/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts(accounts.filter((a) => a.id !== accountId));
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Payment Accounts</h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure mobile wallet & bank transfer destinations receiving customer payments
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 transition shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Account</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`p-5 rounded-2xl border transition shadow-lg ${
              acc.is_active
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-950/60 border-slate-800/60 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {acc.method}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleToggleActive(acc)}
                  title={acc.is_active ? 'Disable Channel' : 'Enable Channel'}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    acc.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  title="Delete Account"
                  className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-base font-bold text-white mb-0.5">{acc.account_title}</div>
            <div className="text-sm font-mono font-bold text-emerald-400 select-all mb-2">
              {acc.account_number}
            </div>

            {acc.bank_name && (
              <div className="text-xs text-slate-400 mb-1">{acc.bank_name}</div>
            )}
            {acc.iban && (
              <div className="text-[10px] text-slate-500 font-mono mb-3 truncate">
                IBAN: {acc.iban}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Daily Limit: PKR {Number(acc.daily_limit).toLocaleString()}</span>
              <span>Priority: {acc.priority}</span>
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No payment channels configured</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
              Add your JazzCash, EasyPaisa, or bank account so the payment engine can start routing customer orders.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
            >
              Add First Account
            </button>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add Payment Account</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                  >
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="bank_transfer">Bank Transfer / Raast</option>
                    <option value="sadapay">SadaPay</option>
                    <option value="nayapay">NayaPay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Account Title</label>
                <input
                  type="text"
                  required
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  placeholder="e.g. Ali Traders SMC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Account Number / Mobile Wallet No
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 03001234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Bank Name (Optional)</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Meezan Bank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Daily Limit (PKR)</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">IBAN (Optional)</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="PK00MEZN000101..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {loading ? 'Adding...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
