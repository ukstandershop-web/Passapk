'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, ShieldCheck, ArrowRight, Loader2, AlertCircle, Globe } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '';

  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Internationalization dictionary
  const t = {
    en: {
      title: 'Sign In to Your Account',
      subtitle: 'Manage your payments, bridge phone, and webhooks',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      forgotPassword: 'Forgot password?',
      signInBtn: 'Sign In to Dashboard',
      twoFactorTitle: 'Two-Factor Verification',
      twoFactorSubtitle: 'Enter the 6-digit code from your authenticator app',
      totpLabel: '6-Digit TOTP Code',
      backupLabel: '8-Character Backup Code',
      useBackupLink: 'Lost access to phone? Use Backup Code',
      useTotpLink: 'Use Authenticator Code',
      verify2faBtn: 'Verify & Continue',
      lockoutMsg: 'Account is locked due to repeated failed attempts.',
    },
    ur: {
      title: 'Apne Account mein Login Karein',
      subtitle: 'Apni adaiyigiyan, bridge phone aur webhooks ka intezam karein',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      forgotPassword: 'Password bhool gaye?',
      signInBtn: 'Dashboard mein Dakhil Hon',
      twoFactorTitle: 'Do-Darjati Tasdeeq (2FA)',
      twoFactorSubtitle: 'Apne authenticator app se 6-hanso ka code darj karein',
      totpLabel: '6-Hanso ka Code',
      backupLabel: '8-Hurf ka Backup Code',
      useBackupLink: 'Phone dastiyab nahi? Backup code istemal karein',
      useTotpLink: 'Authenticator code istemal karein',
      verify2faBtn: 'Tasdeeq Karein aur Aagay Barhein',
      lockoutMsg: 'Musalsal ghalat koshishon ki wajah se account lock kar diya gaya hai.',
    },
  }[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        email,
        password,
      };

      if (requires2fa) {
        if (useBackup) {
          payload.backup_code = backupCode;
        } else {
          payload.totp_code = totpCode;
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.requires2fa) {
        setRequires2fa(true);
        setLoading(false);
        return;
      }

      // Route based on role
      if (redirectPath) {
        router.push(redirectPath);
      } else if (data.user?.role === 'owner') {
        router.push('/owner');
      } else {
        router.push('/merchant');
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Language Switcher */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-emerald-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 transition"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'Roman Urdu' : 'English'}</span>
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {requires2fa ? t.twoFactorTitle : t.title}
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          {requires2fa ? t.twoFactorSubtitle : t.subtitle}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!requires2fa ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.pk"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t.passwordLabel}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-emerald-400 hover:underline"
                >
                  {t.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>{t.signInBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* 2FA Form Section */}
            {!useBackup ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.totpLabel}
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-base tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.backupLabel}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    maxLength={9}
                    required
                    autoFocus
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="7A1F-9C4B"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-base tracking-widest text-center text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition"
                  />
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => setUseBackup(!useBackup)}
                className="text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                {useBackup ? t.useTotpLink : t.useBackupLink}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>{t.verify2faBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
