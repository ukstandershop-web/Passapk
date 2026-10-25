'use client';

import React, { useState } from 'react';
import { PlanDefinition, PlatformPaymentAccount } from '@paisabridge/shared';
import { Check, ArrowRight, ArrowLeft, Upload, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface OnboardingWizardProps {
  plans: PlanDefinition[];
  platformAccounts: PlatformPaymentAccount[];
  existingProof: any;
  currentStatus: string;
}

export function OnboardingWizard({
  plans,
  platformAccounts,
  existingProof,
  currentStatus,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || 'starter');
  const [amountPaid, setAmountPaid] = useState<number>(plans[0]?.activation_fee || 2500);
  const [senderAccount, setSenderAccount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState(!!existingProof && existingProof.status === 'pending');

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handlePlanSelect = (plan: PlanDefinition) => {
    setSelectedPlanId(plan.id);
    setAmountPaid(plan.activation_fee);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Proof screenshot size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/merchant/onboarding/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          amount_paid: amountPaid,
          sender_account: senderAccount,
          payment_method: paymentMethod,
          proof_data_url: proofDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Proof submission failed');
      }

      setProofSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'active') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Your Account Is Fully Activated!</h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto">
          Your activation fee has been verified. You can now add payment channels, connect your Android Bridge phone, and start collecting payments.
        </p>
        <div className="pt-2">
          <Link
            href="/merchant"
            className="inline-flex items-center space-x-2 py-3 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition"
          >
            <span>Go to Merchant Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (proofSubmitted) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-white">Payment Proof Under Review</h2>
        <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
          Your activation proof for plan <strong>{selectedPlan?.name || 'Selected Plan'}</strong> (PKR {amountPaid}) has been submitted. The platform owner is verifying the transfer.
        </p>
        <div className="text-[11px] text-slate-500">
          Typical verification time: 10–30 minutes during business hours.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
      {/* Wizard Steps Indicator */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        {[
          { num: 1, label: '1. Select Plan' },
          { num: 2, label: '2. Payment Details' },
          { num: 3, label: '3. Upload Proof' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center space-x-2 text-xs font-semibold ${
              step >= s.num ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                step >= s.num ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Plan */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isSelected = selectedPlanId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handlePlanSelect(p)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/80 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white text-sm">{p.name}</h3>
                      {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-xl font-extrabold text-emerald-400">
                      PKR {p.monthly_fee.toLocaleString()}
                      <span className="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 pb-3 border-b border-slate-800">
                      One-time Activation Fee: <strong>PKR {p.activation_fee.toLocaleString()}</strong>
                    </div>

                    <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <li>• {p.monthly_transaction_limit.toLocaleString()} monthly txns</li>
                      <li>• {p.max_pending_orders} concurrent pending</li>
                      {p.features?.map((f, i) => (
                        <li key={i} className="text-slate-400">• {f}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`w-full mt-6 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-3 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Payment Instructions */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300">
            You selected <strong>{selectedPlan?.name}</strong>. Please transfer the activation fee of{' '}
            <strong className="text-emerald-400">PKR {selectedPlan?.activation_fee.toLocaleString()}</strong> to one of the platform accounts below:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformAccounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{acc.title}</span>
                  <span className="uppercase text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                    {acc.type}
                  </span>
                </div>
                <div className="text-sm font-mono font-bold text-emerald-400 select-all">
                  {acc.number}
                </div>
                {acc.iban && <div className="text-[10px] text-slate-400 font-mono">IBAN: {acc.iban}</div>}
                {acc.bank_name && <div className="text-[11px] text-slate-400">{acc.bank_name}</div>}
                {acc.instructions && <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">{acc.instructions}</div>}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="py-3 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              <span>I Have Sent Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Upload Proof */}
      {step === 3 && (
        <form onSubmit={handleSubmitProof} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Exact Amount Transferred (PKR)
              </label>
              <input
                type="number"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payment Channel Used
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="jazzcash">JazzCash Mobile Account</option>
                <option value="easypaisa">EasyPaisa Mobile Account</option>
                <option value="bank_transfer">Online Bank Transfer / Raast</option>
                <option value="sadapay">SadaPay</option>
                <option value="nayapay">NayaPay</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sender Account Number / Mobile Number
            </label>
            <input
              type="text"
              required
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              placeholder="e.g. 03001234567 or IBAN"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Screenshot / Receipt Proof
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center cursor-pointer relative bg-slate-950/60">
              <input
                type="file"
                accept="image/*"
                required
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium">Click or drag receipt screenshot here</p>
              <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG up to 5MB</p>
              {proofDataUrl && (
                <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center justify-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Image attached</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Proof...</span>
                </>
              ) : (
                <>
                  <span>Submit Proof for Approval</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
