'use client';

import React, { useState } from 'react';
import { MerchantApiKey } from '@paisabridge/shared';

interface ApiKeysManagerProps {
  initialKeys: MerchantApiKey[];
}

export default function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const [keys, setKeys] = useState<MerchantApiKey[]>(initialKeys);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal for displaying newly generated or rotated secret
  const [revealedSecret, setRevealedSecret] = useState<{
    keyName: string;
    publicKey: string;
    secretKey: string;
    isRotation?: boolean;
  } | null>(null);

  const [copiedPublic, setCopiedPublic] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/merchant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim(),
          is_live: isLive,
          ip_whitelist: ipWhitelist.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create key');

      setKeys([data.key, ...keys]);
      setRevealedSecret({
        keyName: data.key.name,
        publicKey: data.key.public_key,
        secretKey: data.raw_secret,
        isRotation: false,
      });

      setKeyName('');
      setIpWhitelist('');
      setIsLive(true);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotateKey = async (key: MerchantApiKey) => {
    if (
      !confirm(
        `Rotate secret for "${key.name}"? The existing secret key will stop working immediately.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/merchant/api-keys/${key.id}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rotate key');

      // Update state
      setKeys(keys.map((k) => (k.id === key.id ? { ...k, secret_prefix: data.key.secret_prefix } : k)));
      setRevealedSecret({
        keyName: key.name,
        publicKey: key.public_key,
        secretKey: data.new_raw_secret,
        isRotation: true,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Permanently revoke "${name}"? Any active integrations using this key will immediately fail.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/merchant/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke key');
      }
      setKeys(keys.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPublic(id);
    setTimeout(() => setCopiedPublic(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Credentials</h1>
          <p className="text-sm text-slate-500 mt-1">
            Authenticate your backend or e-commerce platform with the PaisaBridge Worker API.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create API Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">No API Keys Configured</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Generate your first Public and Secret API key pair to start accepting payments.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Generate Key Pair
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Name / Environment</th>
                  <th className="px-6 py-3.5">Public Key</th>
                  <th className="px-6 py-3.5">Secret Prefix</th>
                  <th className="px-6 py-3.5">IP Whitelist</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{key.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            key.is_live
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {key.is_live ? 'Live' : 'Test'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-800">
                          {key.public_key}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.public_key, key.id)}
                          className="text-xs text-slate-400 hover:text-slate-600 transition"
                          title="Copy Public Key"
                        >
                          {copiedPublic === key.id ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-slate-500 font-mono">
                        {key.secret_prefix}...••••••••
                      </code>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {key.ip_whitelist && key.ip_whitelist.length > 0 ? (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {key.ip_whitelist.length} {key.ip_whitelist.length === 1 ? 'IP' : 'IPs'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Any (Unrestricted)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => handleRotateKey(key)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition"
                        >
                          Rotate
                        </button>
                        <button
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          className="text-red-600 hover:text-red-800 font-medium transition"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Create New API Key</h2>
            <p className="text-xs text-slate-500 mt-1">
              Generate a unique key pair for checkout initiation from your backend server.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateKey} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Key Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WooCommerce Production, Laravel Backend"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLive(true)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                      isLive
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🚀 Live Production
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLive(false)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition ${
                      !isLive
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🧪 Test Sandbox
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IP Whitelist (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.1, 10.0.0.1 (comma-separated)"
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to allow payment requests from any server IP address.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Creating...' : 'Generate API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Reveal Modal */}
      {revealedSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {revealedSecret.isRotation ? 'Secret Key Rotated' : 'API Key Created'}
              </h2>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
                ⚠️ Copy your Secret Key now. It is stored hashed and will <strong>never</strong> be shown again.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Public Key</label>
                <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                  {revealedSecret.publicKey}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Secret Key</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(revealedSecret.secretKey);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                  >
                    {copiedSecret ? '✓ Copied' : 'Copy Secret'}
                  </button>
                </label>
                <div className="mt-1 p-2 bg-slate-100 rounded border border-slate-200 font-mono text-xs text-emerald-700 font-bold break-all select-all">
                  {revealedSecret.secretKey}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRevealedSecret(null)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
              >
                I Have Stored This Secret Safely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
