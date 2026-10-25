'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Smartphone, 
  RefreshCw,
  Send
} from 'lucide-react';

interface CheckoutData {
  id: string;
  order_id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_logo?: string;
  merchant_color?: string;
  message?: string;
  return_url?: string;
  base_amount: number;
  final_amount: number;
  decimal_offset: number;
  account_provider: string;
  account_title: string;
  account_number: string;
  status: 'pending' | 'success' | 'expired' | 'flagged' | 'refunded';
  expires_at: string;
}

export default function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes default
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualTid, setManualTid] = useState('');
  const [manualScreenshot, setManualScreenshot] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualSubmitted, setManualSubmitted] = useState(false);

  // Fetch checkout details
  const fetchCheckout = async () => {
    try {
      const res = await fetch(`/api/pay/${token}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Payment link not found or expired');
      }
      const data = await res.json();
      setCheckout(data);
      
      // Calculate remaining time
      if (data.expires_at) {
        const diff = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000);
        setTimeLeft(diff > 0 ? diff : 0);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckout();
    // Poll every 3 seconds for status updates
    const pollInterval = setInterval(() => {
      fetchCheckout();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [token]);

  // Countdown timer ticker
  useEffect(() => {
    if (!checkout || checkout.status !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [checkout]);

  // Handle redirect on success
  useEffect(() => {
    if (checkout?.status === 'success' && checkout.return_url) {
      const timeout = setTimeout(() => {
        window.location.href = checkout.return_url!;
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [checkout?.status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTid) return;
    setManualSubmitting(true);
    try {
      const res = await fetch(`/api/pay/${token}/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tid: manualTid, screenshot_url: manualScreenshot }),
      });
      if (!res.ok) throw new Error('Failed to submit manual payment claim');
      setManualSubmitted(true);
      setManualFormOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading secure payment invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !checkout) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Payment Link Error</h1>
          <p className="text-sm text-slate-400 mb-6">{error || 'This payment link is invalid or has expired.'}</p>
          <a
            href="/"
            className="inline-block w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  const primaryColor = checkout.merchant_color || '#059669';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header / Branding */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-3">
        <div className="flex items-center space-x-3">
          {checkout.merchant_logo ? (
            <img src={checkout.merchant_logo} alt="Merchant Logo" className="w-9 h-9 rounded-xl object-cover shadow" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
              {checkout.merchant_name?.[0] || 'P'}
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white">{checkout.merchant_name}</h2>
            <p className="text-xs text-slate-400">Order #{checkout.order_id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure Gateway</span>
        </div>
      </header>

      {/* Main Checkout Box */}
      <main className="max-w-md w-full mx-auto my-auto py-4">
        {/* SUCCESS STATE */}
        {checkout.status === 'success' && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center shadow-2xl animate-fade-in">
            <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-2">Payment Verified!</h1>
            <p className="text-sm text-slate-300 mb-6">
              We received your payment of <span className="font-bold text-emerald-400">{checkout.final_amount.toFixed(2)} PKR</span> successfully.
            </p>
            {checkout.return_url ? (
              <p className="text-xs text-slate-400 mb-6 animate-pulse">Redirecting back to merchant store...</p>
            ) : (
              <a
                href="/"
                className="inline-block w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/30"
              >
                Done
              </a>
            )}
          </div>
        )}

        {/* FLAGGED OR EXPIRED STATE */}
        {(checkout.status === 'expired' || checkout.status === 'flagged') && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {checkout.status === 'expired' ? 'Payment Session Expired' : 'Payment Under Review'}
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              {checkout.status === 'expired'
                ? 'The 5-minute payment window has elapsed. If you have already transferred funds, please submit your transaction reference below.'
                : 'Your payment was flagged for manual review and is currently being verified by the merchant team.'}
            </p>

            {manualSubmitted ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-medium">
                Claim submitted successfully! The merchant will verify and approve your payment shortly.
              </div>
            ) : !manualFormOpen ? (
              <button
                onClick={() => setManualFormOpen(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition shadow-lg shadow-amber-600/20"
              >
                I Already Paid (Submit Proof)
              </button>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Transaction ID / TID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3829102948"
                    value={manualTid}
                    onChange={(e) => setManualTid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Screenshot URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://imgur.com/..."
                    value={manualScreenshot}
                    onChange={(e) => setManualScreenshot(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setManualFormOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualSubmitting}
                    className="flex-1 py-3 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 transition shadow-lg shadow-amber-600/20"
                  >
                    {manualSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* PENDING STATE */}
        {checkout.status === 'pending' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Top Timer & Badge */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Waiting for Transfer</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Custom Message if any */}
            {checkout.message && (
              <div className="mb-6 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-300">
                {checkout.message}
              </div>
            )}

            {/* EXACT AMOUNT DISPLAY (CRITICAL) */}
            <div className="mb-6 p-6 bg-slate-950 border border-emerald-500/30 rounded-2xl text-center relative">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                Send Exact Amount
              </span>
              <div className="flex items-center justify-center space-x-2 my-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  {checkout.final_amount.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-emerald-400">PKR</span>
              </div>
              <button
                onClick={() => copyToClipboard(checkout.final_amount.toFixed(2), 'amount')}
                className="mt-2 inline-flex items-center space-x-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                {copiedField === 'amount' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'amount' ? 'Amount Copied!' : 'Copy Exact Amount'}</span>
              </button>

              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-medium leading-relaxed text-left flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Send <strong>exactly {checkout.final_amount.toFixed(2)} PKR</strong> including the decimal cents. Any other amount will fail automatic verification!
                </span>
              </div>
            </div>

            {/* RECEIVING ACCOUNT DETAILS */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <span>Receiving Account ({checkout.account_provider})</span>
                <span className="text-emerald-400 font-mono">Active Bridge</span>
              </div>

              {/* Account Title */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Title</span>
                  <span className="text-sm font-bold text-white">{checkout.account_title}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(checkout.account_title, 'title')}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition"
                  title="Copy Title"
                >
                  {copiedField === 'title' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Account Number / IBAN */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Number / IBAN</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{checkout.account_number}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(checkout.account_number, 'number')}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition"
                  title="Copy Number"
                >
                  {copiedField === 'number' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Manual Proof Submission trigger */}
            <div className="pt-4 border-t border-slate-800/80 text-center">
              <button
                onClick={() => setManualFormOpen(true)}
                className="text-xs text-slate-400 hover:text-white underline transition"
              >
                Already transferred but not verified? Submit payment claim
              </button>

              {manualFormOpen && (
                <form onSubmit={handleManualSubmit} className="mt-4 space-y-3 text-left p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <h4 className="text-xs font-bold text-white mb-2">Manual Payment Claim</h4>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Transaction ID / TID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 3829102948"
                      value={manualTid}
                      onChange={(e) => setManualTid(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setManualFormOpen(false)}
                      className="flex-1 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={manualSubmitting}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                    >
                      {manualSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center py-4 text-xs text-slate-400">
        Powered by <span className="font-semibold text-slate-300">PaisaBridge PK</span> &bull; Automated Bank Reconciliation
      </footer>
    </div>
  );
}
