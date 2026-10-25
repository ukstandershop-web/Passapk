'use client';

import React, { useState } from 'react';
import { MerchantBranding } from '@paisabridge/shared';

interface BrandingManagerProps {
  initialBranding: MerchantBranding;
  businessName: string;
}

export default function BrandingManager({
  initialBranding,
  businessName,
}: BrandingManagerProps) {
  const [logoUrl, setLogoUrl] = useState(initialBranding.logo_url || '');
  const [brandColor, setBrandColor] = useState(initialBranding.brand_color || '#059669');
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialBranding.welcome_message || 'Please send the exact amount including paisas.'
  );
  const [successUrl, setSuccessUrl] = useState(initialBranding.success_url || '');
  const [cancelUrl, setCancelUrl] = useState(initialBranding.cancel_url || '');
  const [showTimer, setShowTimer] = useState(initialBranding.show_timer !== false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetColors = ['#059669', '#4F46E5', '#7C3AED', '#0284C7', '#DC2626', '#0F172A'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/merchant/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrl.trim(),
          brand_color: brandColor.trim(),
          welcome_message: welcomeMessage.trim(),
          success_url: successUrl.trim(),
          cancel_url: cancelUrl.trim(),
          show_timer: showTimer,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save branding');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Checkout Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize the hosted checkout page your customers see when paying via JazzCash or EasyPaisa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Settings Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
              ✓ Branding settings saved successfully! Live checkout will now reflect these changes.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Logo Image URL
              </label>
              <input
                type="url"
                placeholder="https://yourstore.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Square or horizontal PNG/SVG with transparent background recommended.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Brand Accent Color
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBrandColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        brandColor.toLowerCase() === color.toLowerCase()
                          ? 'border-slate-900 scale-110 shadow-xs'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-6 h-6 border-0 p-0 cursor-pointer rounded"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-20 text-xs font-mono font-semibold uppercase text-slate-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Welcome / Instruction Note for Customers
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="e.g. Please transfer the exact amount including paisas for instant confirmation."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Success Redirect URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourstore.com/order-success"
                  value={successUrl}
                  onChange={(e) => setSuccessUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancel / Return URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourstore.com/cart"
                  value={cancelUrl}
                  onChange={(e) => setCancelUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(e) => setShowTimer(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-700">
                  Show countdown expiry timer on customer checkout (Recommended)
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                {isSaving ? 'Saving Changes...' : 'Save Branding'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Interactive Live Simulation Preview */}
        <div className="lg:col-span-5 space-y-3 sticky top-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Customer Checkout Preview</span>
            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              Mobile View
            </span>
          </div>

          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200/80 shadow-inner flex justify-center">
            <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col">
              {/* Header with Brand Color */}
              <div
                className="p-4 text-white transition-colors duration-300"
                style={{ backgroundColor: brandColor }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Store Logo"
                        className="h-6 w-auto max-w-[100px] object-contain rounded bg-white/20 p-0.5"
                        onError={(e) => ((e.target as any).style.display = 'none')}
                      />
                    ) : (
                      <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center font-bold text-xs">
                        {businessName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="font-bold text-sm tracking-tight">{businessName}</span>
                  </div>
                  {showTimer && (
                    <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded-full font-mono font-bold">
                      ⏱ 05:42
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 text-xs flex-1">
                {welcomeMessage && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {welcomeMessage}
                  </p>
                )}

                {/* Simulated Payment Card */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>Exact Amount to Pay:</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      MATCH REQUIRED
                    </span>
                  </div>
                  <div className="text-xl font-black text-slate-900">
                    PKR 2,499.<span style={{ color: brandColor }}>37</span>
                  </div>
                  <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                    ⚠️ Transfer <strong>exact 37 paisas</strong> so payment confirms instantly.
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span>Account Title:</span>
                    <strong className="text-slate-800">{businessName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Number:</span>
                    <span className="font-mono font-bold text-slate-900">0300-1234567</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span className="font-semibold text-slate-800">JazzCash / Raast</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div
                    className="w-full py-2 text-white font-bold text-center rounded-lg shadow-xs text-xs opacity-90 cursor-not-allowed"
                    style={{ backgroundColor: brandColor }}
                  >
                    Checking for Payment... 🔄
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
