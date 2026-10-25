'use client';

import React, { useState } from 'react';
import { BridgeDevice } from '@paisabridge/shared';

interface DevicesManagerProps {
  initialDevices: BridgeDevice[];
  workerBaseUrl: string;
}

interface NewDeviceModalData {
  device: BridgeDevice;
  rawSecret: string;
  pairingPayload: Record<string, any>;
}

export default function DevicesManager({ initialDevices, workerBaseUrl }: DevicesManagerProps) {
  const [devices, setDevices] = useState<BridgeDevice[]>(initialDevices);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success modal for freshly generated pairing secret and QR
  const [newPairingData, setNewPairingData] = useState<NewDeviceModalData | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/merchant/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_name: deviceName.trim(),
          device_model: deviceModel.trim() || 'Android Device',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add device');

      setDevices([data.device, ...devices]);
      setNewPairingData({
        device: data.device,
        rawSecret: data.raw_secret,
        pairingPayload: data.pairing_payload,
      });

      setDeviceName('');
      setDeviceModel('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeDevice = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke "${name}"? It will immediately stop forwarding SMS payment notifications.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/merchant/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke device');
      }
      setDevices(devices.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isOnline = (lastHeartbeat?: string | null) => {
    if (!lastHeartbeat) return false;
    const diffSeconds = (Date.now() - new Date(lastHeartbeat).getTime()) / 1000;
    return diffSeconds <= 180; // 3 minutes tolerance
  };

  const formatLastSeen = (lastHeartbeat?: string | null) => {
    if (!lastHeartbeat) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const qrImageUrl = newPairingData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
        JSON.stringify(newPairingData.pairingPayload)
      )}`
    : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bridge Android Devices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated Android phones running PaisaBridge APK that listen for SMS & Push notifications.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Bridge Device
        </button>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">No Bridge Devices Paired</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Install the PaisaBridge APK on an Android device with JazzCash / EasyPaisa SIMs and scan the pairing QR code.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
          >
            Pair First Device
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((device) => {
            const online = isOnline(device.last_heartbeat_at);
            return (
              <div
                key={device.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-red-400'}`} />
                        <h3 className="font-semibold text-slate-900">{device.device_name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 ml-4.5">{device.device_model || 'Android Phone'}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Device ID</span>
                      <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {device.device_id}
                      </code>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Battery</span>
                      <span className="font-medium text-slate-800">
                        {device.battery_level !== undefined ? `${device.battery_level}%` : 'Unknown'}
                        {device.is_charging && ' ⚡ (Charging)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>App Version</span>
                      <span className="font-medium text-slate-800">{device.app_version || 'v1.0.0'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Last Heartbeat</span>
                      <span className="font-medium text-slate-800">{formatLastSeen(device.last_heartbeat_at)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Key Prefix</span>
                      <code className="text-slate-500 text-[11px]">{device.api_key_prefix}...</code>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Added {new Date(device.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRevokeDevice(device.id, device.device_name)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Add Bridge Device</h2>
            <p className="text-xs text-slate-500 mt-1">
              Give your phone a friendly label (e.g., &quot;Shop JazzCash Phone&quot;) to generate its pairing QR.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterDevice} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Name / Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter Samsung A12"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Device Model (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Infinix Hot 30, Samsung A14"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Generating Secret...' : 'Generate Pairing Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freshly Generated Pairing Credentials & QR Modal */}
      {newPairingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Device Ready to Pair!</h2>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
                ⚠️ Copy this Secret Key now. For security, it will <strong>never</strong> be displayed again.
              </p>
            </div>

            {/* QR Code Section */}
            <div className="mt-5 flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <img
                src={qrImageUrl}
                alt="Bridge Pairing QR Code"
                width={200}
                height={200}
                className="rounded-lg shadow-xs bg-white p-2"
              />
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Open <strong>PaisaBridge Android App</strong> &gt; Tap <strong>Scan QR</strong> to auto-configure.
              </p>
            </div>

            {/* Credentials Section */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Device Secret Key</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newPairingData.rawSecret);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                  >
                    {copiedKey ? '✓ Copied' : 'Copy Key'}
                  </button>
                </label>
                <div className="mt-1 p-2 bg-slate-100 rounded border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                  {newPairingData.rawSecret}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 flex justify-between">
                  <span>Full Pairing Config (JSON)</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(newPairingData.pairingPayload, null, 2));
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                  >
                    {copiedJson ? '✓ Copied' : 'Copy JSON'}
                  </button>
                </label>
                <textarea
                  readOnly
                  rows={4}
                  value={JSON.stringify(newPairingData.pairingPayload, null, 2)}
                  className="mt-1 w-full p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded border border-slate-700 resize-none select-all"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setNewPairingData(null)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
              >
                I Have Saved / Paired This Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
