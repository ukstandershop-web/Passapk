'use client';

import React, { useState } from 'react';
import { WebhookJob } from '@paisabridge/shared';

interface WebhooksManagerProps {
  initialUrl: string;
  initialSecret: string;
  initialLogs: WebhookJob[];
}

export default function WebhooksManager({
  initialUrl,
  initialSecret,
  initialLogs,
}: WebhooksManagerProps) {
  const [webhookUrl, setWebhookUrl] = useState(initialUrl);
  const [webhookSecret, setWebhookSecret] = useState(initialSecret);
  const [logs, setLogs] = useState<WebhookJob[]>(initialLogs);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Test inspection result modal
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status_code: number;
    latency_ms: number;
    response_body: string;
    error: string | null;
  } | null>(null);

  const handleSaveConfig = async (regenerate = false) => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/merchant/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl.trim(),
          regenerate_secret: regenerate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save webhook settings');

      setWebhookUrl(data.webhook_url || '');
      setWebhookSecret(data.webhook_secret || '');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!webhookUrl) {
      alert('Please enter and save a Webhook URL first.');
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('/api/merchant/webhooks/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test event');

      setTestResult({
        success: data.success,
        status_code: data.status_code,
        latency_ms: data.latency_ms,
        response_body: data.response_body,
        error: data.error,
      });

      if (data.job) {
        setLogs([data.job, ...logs]);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      const res = await fetch(`/api/merchant/webhooks/resend/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');

      setLogs(logs.map((log) => (log.id === id ? data.job : log)));
      alert(data.success ? 'Webhook delivered successfully!' : `Delivery returned status HTTP ${data.status_code}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Webhooks & Event Streams</h1>
          <p className="text-sm text-slate-500 mt-1">
            Receive real-time signed HTTP POST notifications when a customer completes their payment.
          </p>
        </div>
        <button
          onClick={handleSendTest}
          disabled={isTesting || !webhookUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          {isTesting ? (
            'Pinging Endpoint...'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Send Test Webhook
            </>
          )}
        </button>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900">Webhook Endpoint Settings</h2>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination URL (HTTPS Recommended)
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="https://yourdomain.com/api/webhooks/paisabridge"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                onClick={() => handleSaveConfig(false)}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
              >
                {isSaving ? 'Saving...' : 'Save URL'}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-xs text-emerald-600 font-medium mt-1.5">✓ Settings updated successfully!</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Signing Secret (HMAC-SHA256)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 break-all select-all">
                {webhookSecret || 'No secret generated'}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webhookSecret);
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                {copiedSecret ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Regenerate secret? You will need to update the secret on your backend server.')) {
                    handleSaveConfig(true);
                  }
                }}
                className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 text-xs font-semibold rounded-lg transition"
              >
                Regenerate
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Every request carries header <code className="text-slate-600">X-PaisaBridge-Signature: t=...,v1=...</code>. Verify signature using this secret.
            </p>
          </div>
        </div>
      </div>

      {/* Delivery Logs */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Recent Deliveries</h2>
          <span className="text-xs text-slate-500">Showing last {logs.length} attempts</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            No webhook delivery attempts recorded yet. Click &quot;Send Test Webhook&quot; to test your receiver.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Event</th>
                  <th className="px-6 py-3.5">HTTP Response</th>
                  <th className="px-6 py-3.5">Attempts</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isDelivered = log.status === 'delivered';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'retrying'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDelivered ? 'bg-emerald-600' : log.status === 'retrying' ? 'bg-amber-600' : 'bg-red-600'
                            }`}
                          />
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-800">
                          {log.event}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {log.last_status_code ? (
                          <span
                            className={
                              log.last_status_code >= 200 && log.last_status_code < 300
                                ? 'text-emerald-700 font-semibold'
                                : 'text-red-600 font-semibold'
                            }
                          >
                            HTTP {log.last_status_code}
                          </span>
                        ) : (
                          <span className="text-slate-400">{log.last_error || 'No response'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {log.attempt_count} / {log.max_attempts}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString()} · {new Date(log.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={resendingId === log.id}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition"
                        >
                          {resendingId === log.id ? 'Resending...' : 'Resend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Result Inspector Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Webhook Test Result</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                    testResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testResult.success ? 'Success' : 'Failed'}
                </span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{testResult.latency_ms} ms</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status Code</span>
                <span className="font-mono font-bold text-slate-900">
                  {testResult.status_code ? `HTTP ${testResult.status_code}` : 'Connection Refused'}
                </span>
              </div>

              {testResult.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <span className="font-semibold">Error:</span> {testResult.error}
                </div>
              )}

              <div>
                <span className="block text-slate-500 font-medium mb-1">Server Response Body</span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                  {testResult.response_body || '(Empty body returned by server)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
