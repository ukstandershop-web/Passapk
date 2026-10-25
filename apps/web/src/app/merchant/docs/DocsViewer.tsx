'use client';

import React, { useState } from 'react';

interface DocsViewerProps {
  workerUrl: string;
  sampleApiKey: string;
}

export default function DocsViewer({ workerUrl, sampleApiKey }: DocsViewerProps) {
  const [activeLang, setActiveLang] = useState<'curl' | 'node' | 'php' | 'python'>('curl');
  const [copied, setCopied] = useState(false);

  // Sandbox states
  const [sandboxOrderId, setSandboxOrderId] = useState('ORDER_' + Math.floor(Math.random() * 90000 + 10000));
  const [sandboxAmount, setSandboxAmount] = useState('1500');
  const [sandboxPhone, setSandboxPhone] = useState('03001234567');
  const [sandboxMethod, setSandboxMethod] = useState('jazzcash');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const snippets = {
    curl: `curl -X POST "${workerUrl}/v1/payments" \\
  -H "Authorization: Bearer ${sampleApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORD-12345",
    "amount": 1500,
    "method": "jazzcash",
    "customer_phone": "03001234567",
    "customer_name": "Ali Khan"
  }'`,
    node: `// Node.js 18+ native fetch
const createPayment = async () => {
  const response = await fetch('${workerUrl}/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${sampleApiKey}',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: 'ORD-12345',
      amount: 1500,
      method: 'jazzcash',
      customer_phone: '03001234567',
      customer_name: 'Ali Khan'
    })
  });

  const data = await response.json();
  console.log('Redirect customer to:', data.payment.checkout_url);
  console.log('Exact amount to pay:', data.payment.total_amount);
};`,
    php: `<?php
// PHP cURL
$ch = curl_init('${workerUrl}/v1/payments');
$payload = json_encode([
    'order_id' => 'ORD-12345',
    'amount' => 1500,
    'method' => 'jazzcash',
    'customer_phone' => '03001234567',
    'customer_name' => 'Ali Khan'
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ${sampleApiKey}',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
header('Location: ' . $result['payment']['checkout_url']);
exit;
?>`,
    python: `import requests

url = "${workerUrl}/v1/payments"
headers = {
    "Authorization": "Bearer ${sampleApiKey}",
    "Content-Type": "application/json"
}
payload = {
    "order_id": "ORD-12345",
    "amount": 1500,
    "method": "jazzcash",
    "customer_phone": "03001234567",
    "customer_name": "Ali Khan"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("Checkout URL:", data["payment"]["checkout_url"])
print("Exact PKR Amount:", data["payment"]["total_amount"])`,
  };

  const webhookVerifyNode = `// Verify Webhook Signature in Node.js
import crypto from 'crypto';

export function verifySignature(rawBody, signatureHeader, secret) {
  // signatureHeader format: "t=1690000000,v1=abc123hex..."
  const parts = Object.fromEntries(signatureHeader.split(',').map(p => p.split('=')));
  const expected = crypto.createHmac('sha256', secret)
    .update(\`\${parts.t}.\${rawBody}\`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}`;

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimError(null);
    setSimulationResult(null);

    try {
      const res = await fetch(`${workerUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sampleApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: sandboxOrderId,
          amount: parseFloat(sandboxAmount),
          method: sandboxMethod,
          customer_phone: sandboxPhone,
          customer_name: 'Sandbox Tester',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Worker request failed');

      setSimulationResult(data);
    } catch (err: any) {
      setSimError(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Documentation &amp; Sandbox</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything you need to initiate payments and verify webhook signatures in your code.
        </p>
      </div>

      {/* Code Snippets Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Create Payment Intent</span>
            <code className="text-xs bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-800">
              POST /v1/payments
            </code>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              {(['curl', 'node', 'php', 'python'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-2.5 py-1 rounded-md capitalize transition ${
                    activeLang === lang ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'node' ? 'Node.js' : lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(snippets[activeLang]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-950">
          <pre className="text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed select-all">
            {snippets[activeLang]}
          </pre>
        </div>
      </div>

      {/* Interactive Sandbox Simulator */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Interactive Sandbox Simulator</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                Live Cloudflare Worker API
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Test creating a payment intent and see the unique decimal offset allocated in real-time.
            </p>
          </div>
        </div>

        {simError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {simError}
          </div>
        )}

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Order ID</label>
            <input
              type="text"
              required
              value={sandboxOrderId}
              onChange={(e) => setSandboxOrderId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Base Amount (PKR)</label>
            <input
              type="number"
              required
              value={sandboxAmount}
              onChange={(e) => setSandboxAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={sandboxMethod}
              onChange={(e) => setSandboxMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="bank_transfer">Bank Transfer / Raast</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              {isSimulating ? 'Creating Intent...' : 'Test Checkout API'}
            </button>
          </div>
        </form>

        {simulationResult && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">API Response (200 OK)</span>
              <a
                href={simulationResult.payment?.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Open Live Hosted Checkout Page &rarr;
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[11px]">Allocated Total Amount</span>
                <div className="text-lg font-black text-emerald-700">
                  PKR {simulationResult.payment?.total_amount}
                </div>
                <span className="text-[10px] text-slate-500">
                  Offset: +{simulationResult.payment?.decimal_offset}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[11px]">Account to Receive Funds</span>
                <div className="text-sm font-bold text-slate-900">
                  {simulationResult.instructions?.account_title}
                </div>
                <code className="text-[11px] text-slate-600 font-mono">
                  {simulationResult.instructions?.account_number}
                </code>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-400 text-[11px]">Payment Token</span>
                <code className="block text-xs font-bold text-indigo-700 font-mono break-all mt-1">
                  {simulationResult.payment?.token}
                </code>
              </div>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48">
              {JSON.stringify(simulationResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Webhook Signature Verification Code */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-3">
        <h2 className="text-base font-bold text-slate-900">Verifying Webhook Signatures</h2>
        <p className="text-xs text-slate-500">
          Ensure events come authentically from PaisaBridge by checking the <code className="text-slate-700 font-mono">X-PaisaBridge-Signature</code> header.
        </p>
        <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
          {webhookVerifyNode}
        </pre>
      </div>
    </div>
  );
}
