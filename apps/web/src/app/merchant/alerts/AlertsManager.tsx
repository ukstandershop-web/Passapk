'use client';

import React, { useState } from 'react';
import { MerchantAlerts } from '@paisabridge/shared';

interface AlertsManagerProps {
  initialAlerts: MerchantAlerts;
  merchantEmail: string;
}

export default function AlertsManager({
  initialAlerts,
  merchantEmail,
}: AlertsManagerProps) {
  const [emailOnPayment, setEmailOnPayment] = useState(initialAlerts.email_on_payment);
  const [emailOnOffline, setEmailOnOffline] = useState(initialAlerts.email_on_offline);
  const [telegramOnPayment, setTelegramOnPayment] = useState(initialAlerts.telegram_on_payment);
  const [telegramOnOffline, setTelegramOnOffline] = useState(initialAlerts.telegram_on_offline);
  const [telegramChatId, setTelegramChatId] = useState(initialAlerts.telegram_chat_id || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/merchant/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_on_payment: emailOnPayment,
          email_on_offline: emailOnOffline,
          telegram_on_payment: telegramOnPayment,
          telegram_on_offline: telegramOnOffline,
          telegram_chat_id: telegramChatId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notification Center &amp; Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure real-time operational notifications via Email and Telegram bots.
        </p>
      </div>

      <div className="max-w-2xl bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
            ✓ Alert preferences updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Email Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Email Notifications</span>
              <span className="text-xs text-slate-400">({merchantEmail})</span>
            </div>
            <div className="space-y-2 border border-slate-200 rounded-lg p-3 text-xs">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailOnPayment}
                  onChange={(e) => setEmailOnPayment(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Payment Received Digest</span>
                  <p className="text-[11px] text-slate-500">Send an immediate email receipt whenever a customer pays.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  checked={emailOnOffline}
                  onChange={(e) => setEmailOnOffline(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Bridge Phone Offline Urgent Alert</span>
                  <p className="text-[11px] text-slate-500">Alert me if my Android phone stops sending heartbeats for &gt; 5 minutes.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Telegram Alerts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">Telegram Instant Bot Alerts</span>
              <span className="text-[11px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">
                Instant Push
              </span>
            </div>

            <div className="space-y-3 border border-slate-200 rounded-lg p-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Telegram Chat ID / Channel ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789 or @yourchannel"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Start our bot on Telegram and send <code className="text-slate-600">/start</code> to obtain your numeric Chat ID.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramOnPayment}
                    onChange={(e) => setTelegramOnPayment(e.target.checked)}
                    className="rounded text-sky-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Telegram: Instant Payment Confirmation</span>
                    <p className="text-[11px] text-slate-500">Includes Order ID, exact PKR amount, and SMS reference code.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-100">
                  <input
                    type="checkbox"
                    checked={telegramOnOffline}
                    onChange={(e) => setTelegramOnOffline(e.target.checked)}
                    className="rounded text-sky-600 w-4 h-4"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Telegram: Bridge Disconnect Alert</span>
                    <p className="text-[11px] text-slate-500">Urgent notification to check SIM balance or phone Wi-Fi connection.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              {isSaving ? 'Saving...' : 'Save Notification Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
