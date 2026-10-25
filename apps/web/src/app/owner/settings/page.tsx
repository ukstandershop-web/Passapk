'App'
'use client';

import { useState, useEffect } from 'react';
import { Settings, Check } from 'lucide-react';

export default function OwnerSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/owner/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.settings);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string, value: any, group: string) => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch('/api/owner/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, group }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Loading platform settings...</div>;
  }

  const general = settings.general_config || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
        <p className="text-sm text-slate-400">Configure global site name, support details, and payment engine parameters.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> Settings updated successfully.
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 max-w-2xl">
        <h3 className="font-semibold text-lg border-b border-slate-800 pb-3">General Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Site Name</label>
            <input
              type="text"
              value={general.site_name || 'PaisaBridge PK'}
              onChange={(e) => setSettings({ ...settings, general_config: { ...general, site_name: e.target.value } })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Support WhatsApp</label>
            <input
              type="text"
              value={general.support_whatsapp || ''}
              onChange={(e) => setSettings({ ...settings, general_config: { ...general, support_whatsapp: e.target.value } })}
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm"
            />
          </div>

          <button
            onClick={() => handleSave('general_config', general, 'general')}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
