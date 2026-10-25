'App'
'use client';

import { useState, useEffect } from 'react';
import { Wrench, Play, Check, Plus, Code } from 'lucide-react';

export default function OwnerParserPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sampleText, setSampleText] = useState('Your JazzCash transfer of Rs. 1500.00 to Ali Store successful. TID: 123456789. Fee: Rs. 0. Balance: Rs. 5000.');
  const [provider, setProvider] = useState('jazzcash');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const fetchRules = () => {
    fetch('/api/owner/parser')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRules(data.rules);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/owner/parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', sample_text: sampleText, provider }),
      });
      const data = await res.json();
      setTestResult(data.extracted);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">SMS Parser Rules & Live Tester</h2>
        <p className="text-sm text-slate-400">Configure regex extraction patterns for mobile wallets and banks, and test live incoming SMS parsing.</p>
      </div>

      {/* Live Tester Box */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-400" /> Interactive SMS Parser Sandbox
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-xs text-slate-400 font-medium">Provider / Gateway</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm"
            >
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="meezan">Meezan Bank</option>
              <option value="hbl">HBL</option>
            </select>

            <label className="text-xs text-slate-400 font-medium">Sample SMS Body</label>
            <textarea
              rows={4}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono"
            />
            <button
              onClick={handleTest}
              disabled={testing}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> {testing ? 'Testing...' : 'Test SMS Parsing'}
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-400" /> Extraction Results
            </h4>
            {testResult ? (
              <pre className="text-xs font-mono text-emerald-400 bg-slate-900 p-3 rounded overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                Run test to view extracted amount, TID, and sender.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold">Active Parser Regex Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-xs text-slate-400 uppercase">
                <th className="p-4">Provider</th>
                <th className="p-4">Sender Pattern</th>
                <th className="p-4">Body Regex</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading rules...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No parser rules found.</td></tr>
              ) : (
                rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/50">
                    <td className="p-4 font-semibold uppercase text-indigo-400">{r.provider}</td>
                    <td className="p-4 font-mono text-xs text-slate-300">{r.sender_pattern || 'Any'}</td>
                    <td className="p-4 font-mono text-xs text-emerald-400 max-w-xs truncate">{r.body_regex}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
