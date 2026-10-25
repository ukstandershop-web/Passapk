'use client';

import React, { useState } from 'react';
import { Merchant, BillingProof } from '@paisabridge/shared';

interface BillingManagerProps {
  merchant: Merchant;
  initialProofs: BillingProof[];
  platformAccounts: any[];
}

export default function BillingManager({
  merchant,
  initialProofs,
  platformAccounts,
}: BillingManagerProps) {
  const [proofs, setProofs] = useState<BillingProof[]>(initialProofs);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>(merchant.tier || 'standard');
  const [amountPaid, setAmountPaid] = useState('2500');
  const [senderAccount, setSenderAccount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('JazzCash');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaid || !senderAccount) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/merchant/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan,
          amount_paid: Number(amountPaid),
          sender_account: senderAccount.trim(),
          payment_method: paymentMethod,
          proof_data_url: proofImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit renewal proof');

      setProofs([data.proof, ...proofs]);
      setIsRenewModalOpen(false);
      setSenderAccount('');
      setProofImage(null);
      alert('Renewal proof submitted! The platform administrator will verify and extend your subscription.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing &amp; Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your gateway subscription, renewal proofs, and past payment receipts.
          </p>
        </div>
        <button
          onClick={() => setIsRenewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Renew / Upgrade Subscription
        </button>
      </div>

      {/* Plan Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</span>
          <div className="text-2xl font-extrabold text-slate-900 capitalize mt-1">
            {merchant.tier} Tier
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Active
          </span>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Fee</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            PKR {merchant.tier === 'pro' ? '5,000' : '2,500'}
            <span className="text-xs font-normal text-slate-500"> / month</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Direct bank transfer with zero gateway cuts.</p>
        </div>

        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account ID</span>
          <code className="block text-xs bg-slate-100 p-2 rounded font-mono text-slate-800 mt-1 break-all">
            {merchant.id}
          </code>
        </div>
      </div>

      {/* Proofs / Invoices History */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Payment &amp; Renewal History</h2>
          <span className="text-xs text-slate-500">{proofs.length} total records</span>
        </div>

        {proofs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No renewal proofs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Amount Paid</th>
                  <th className="px-6 py-3.5">Method &amp; Sender</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Screenshot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <span className="capitalize font-semibold text-slate-900">{proof.type}</span>
                      <div className="text-[11px] text-slate-400 capitalize">{proof.plan_id} Plan</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      PKR {proof.amount_paid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="text-slate-800 font-medium">{proof.payment_method}</div>
                      <code className="text-slate-400 font-mono text-[11px]">{proof.sender_account}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          proof.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : proof.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {proof.status}
                      </span>
                      {proof.rejection_reason && (
                        <div className="text-[11px] text-red-600 mt-1 max-w-xs">
                          {proof.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(proof.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {proof.proof_data_url ? (
                        <a
                          href={proof.proof_data_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline"
                        >
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Renew Subscription</h2>
            <p className="text-xs text-slate-500 mt-1">
              Transfer your renewal fee to our official platform accounts below and submit your transaction proof.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Official Platform Accounts Box */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Official Platform Bank Accounts
              </span>
              {platformAccounts.map((acc, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{acc.title}</span>
                    <span className="capitalize text-emerald-700 font-mono">{acc.type}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>A/C: {acc.number}</span>
                    {acc.iban && <span>IBAN: {acc.iban}</span>}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitRenewal} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tier</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => {
                    setSelectedPlan(e.target.value);
                    setAmountPaid(e.target.value === 'pro' ? '5000' : '2500');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="standard">Standard Tier (PKR 2,500 / month)</option>
                  <option value="pro">Pro High-Volume Tier (PKR 5,000 / month)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Bank Transfer">Bank Transfer / Raast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Sender Account Number / TID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567 or TID 987654321"
                  value={senderAccount}
                  onChange={(e) => setSenderAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Screenshot Proof (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Submitting Proof...' : 'Submit Renewal Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
