'App'
'use client';

import { useState, useEffect } from 'react';
import { Cpu, Battery, Smartphone } from 'lucide-react';

export default function OwnerDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/owner/devices')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDevices(data.devices);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Global Android Bridge Devices</h2>
        <p className="text-sm text-slate-400">Monitor all connected Android SMS & notification bridge phones across all merchants.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs text-slate-400 uppercase">
                <th className="p-4">Merchant</th>
                <th className="p-4">Device Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Battery</th>
                <th className="p-4">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading devices...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No bridge devices registered.</td></tr>
              ) : (
                devices.map((d) => {
                  const isOnline = d.last_heartbeat_at && (Date.now() - new Date(d.last_heartbeat_at).getTime() < 5 * 60 * 1000);
                  return (
                    <tr key={d.id} className="hover:bg-slate-850/50">
                      <td className="p-4 font-semibold text-slate-200">{d.merchant_business_name}</td>
                      <td className="p-4 flex items-center gap-2 font-mono text-xs">
                        <Smartphone className="w-4 h-4 text-cyan-400" /> {d.device_name || 'Android Bridge'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-300">
                        {d.battery_level !== undefined ? `${d.battery_level}%` : 'N/A'}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {d.last_heartbeat_at ? new Date(d.last_heartbeat_at).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
