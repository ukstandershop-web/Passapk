'use client';

import React, { useState } from 'react';

interface ProfileProps {
  userEmail: string;
  userRole: string;
  merchantId?: string;
  totpEnabled: boolean;
  initialLogs: any[];
}

export default function ProfileSecurityManager({
  userEmail,
  userRole,
  merchantId,
  totpEnabled,
  initialLogs,
}: ProfileProps) {
  const [isTotpActive, setIsTotpActive] = useState(totpEnabled);
  const [logs, setLogs] = useState(initialLogs);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA Setup states
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrImageUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Disable 2FA modal
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);

  // Logout all sessions
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const res = await fetch('/api/merchant/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleStart2faSetup = async () => {
    setTotpLoading(true);
    setTotpError(null);
    try {
      const res = await fetch('/api/merchant/profile/2fa');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate 2FA secret');

      setSetupData(data);
      setIs2faModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !totpCode.trim()) return;

    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch('/api/merchant/profile/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: setupData.secret,
          token: totpCode.trim(),
          backupCodes: setupData.backupCodes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid code');

      setIsTotpActive(true);
      setIs2faModalOpen(false);
      setTotpCode('');
      alert('Two-Factor Authentication is now enabled on your account!');
    } catch (err: any) {
      setTotpError(err.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableLoading(true);

    try {
      const res = await fetch('/api/merchant/profile/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

      setIsTotpActive(false);
      setIsDisableModalOpen(false);
      setDisablePassword('');
      alert('2FA disabled successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDisableLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Log out of all devices? You will be prompted to log in again on other browsers.')) {
      return;
    }

    setLogoutAllLoading(true);
    try {
      const res = await fetch('/api/merchant/profile/sessions', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to logout devices');
      alert('All other device sessions have been invalidated.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLogoutAllLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security &amp; Account</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your credentials, two-factor authentication, and active login sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Details & Password */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Account Information</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Email Address</span>
                <span className="font-semibold text-slate-900">{userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Role</span>
                <span className="capitalize font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {userRole}
                </span>
              </div>
              {merchantId && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Merchant ID</span>
                  <code className="text-slate-700 font-mono text-[11px]">{merchantId}</code>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-3">Change Password</h2>

            {passwordError && (
              <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
                ✓ Password changed successfully!
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (8+ chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Two-Factor Authentication (TOTP) Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Two-Factor Authentication (2FA)</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  isTotpActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isTotpActive ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Protect your merchant gateway with standard TOTP (Google Authenticator, Microsoft Authenticator, or 1Password). Whenever you log in, you will be asked for a 6-digit code.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <span>🛡️ Hardware &amp; App Security</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Includes 10 emergency 8-character recovery backup codes to safeguard account access if your phone is lost or upgraded.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Status: {isTotpActive ? 'Active protection' : 'Not configured'}
            </span>

            {isTotpActive ? (
              <button
                onClick={() => setIsDisableModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleStart2faSetup}
                disabled={totpLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                {totpLoading ? 'Loading Setup...' : 'Setup Authenticator (2FA)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions & Login Log */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Login Activity</h2>
            <p className="text-xs text-slate-500">Audit log of authentication attempts on your account.</p>
          </div>
          <button
            onClick={handleLogoutAll}
            disabled={logoutAllLoading}
            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
          >
            {logoutAllLoading ? 'Revoking...' : 'Log Out All Devices'}
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No recent login logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3">Browser / Device</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-800">{log.ip_address || '—'}</td>
                    <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={log.user_agent}>
                      {log.user_agent ? log.user_agent.slice(0, 40) + '...' : 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2FA Setup Modal */}
      {is2faModalOpen && setupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Configure Authenticator App</h2>
            <p className="text-xs text-slate-500 mt-1">
              Scan this QR code with Google Authenticator, Authy, or 1Password.
            </p>

            {totpError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {totpError}
              </div>
            )}

            {/* QR Code & Secret */}
            <div className="mt-4 flex flex-col items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <img
                src={setupData.qrImageUrl}
                alt="2FA QR Code"
                width={180}
                height={180}
                className="rounded-lg shadow-xs bg-white p-2"
              />
              <div className="mt-3 text-center">
                <span className="text-[11px] text-slate-500 block">Manual Secret Key:</span>
                <code className="text-xs font-mono font-bold text-slate-800 select-all bg-white px-2 py-1 rounded border border-slate-200">
                  {setupData.secret}
                </code>
              </div>
            </div>

            {/* Backup Codes Section */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900">Emergency Backup Codes (Save These!)</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
                    setCopiedCodes(true);
                    setTimeout(() => setCopiedCodes(false), 2000);
                  }}
                  className="text-amber-800 font-semibold underline text-[11px]"
                >
                  {copiedCodes ? '✓ Copied' : 'Copy Codes'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-amber-950">
                {setupData.backupCodes.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerify2fa} className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 6-digit Code from Authenticator:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-xl font-mono tracking-widest px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIs2faModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={totpLoading || totpCode.length !== 6}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {totpLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {isDisableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Disable 2FA Protection</h2>
            <p className="text-xs text-slate-500">
              Enter your current account password to confirm removing two-factor authentication.
            </p>

            <form onSubmit={handleDisable2fa} className="space-y-3">
              <input
                type="password"
                required
                placeholder="Current Password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisableModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disableLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition"
                >
                  {disableLoading ? 'Verifying...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
