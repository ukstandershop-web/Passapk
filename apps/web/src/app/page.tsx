import Link from 'next/link';
import { getSession } from '@/lib/session';
import { ShieldCheck, ArrowRight, Zap, Smartphone, Key } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">PaisaBridge PK</span>
            <span className="ml-2 text-xs text-emerald-400 font-mono">v1.0</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold">
          {session ? (
            <Link
              href={session.role === 'owner' ? '/owner' : '/merchant'}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center space-x-2"
            >
              <span>Go to {session.role === 'owner' ? 'Owner Panel' : 'Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/setup" className="text-slate-400 hover:text-white transition">
                Owner Setup
              </Link>
              <Link
                href="/login"
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center space-x-1.5"
              >
                <span>Merchant Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Body */}
      <main className="max-w-4xl w-full mx-auto my-12 text-center flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>Zero-API JazzCash & EasyPaisa Payment Reconciliations</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Accept Pakistani Payments Without Official Bank APIs
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed mb-10">
          PaisaBridge PK automatically matches customer bank transfers and wallet payments using dynamic
          decimal offsets and real-time Android push notification bridges.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xl shadow-emerald-600/25 flex items-center justify-center space-x-2"
          >
            <span>Enter Merchant Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/setup"
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition flex items-center justify-center space-x-2"
          >
            <Key className="w-4 h-4 text-emerald-400" />
            <span>First Owner Setup</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-16 w-full">
          <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Smartphone className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Android Bridge Telemetry</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Lightweight Kotlin background listener relaying JazzCash, EasyPaisa, and bank SMS payloads with encrypted tokens.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <Zap className="w-6 h-6 text-amber-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Dynamic Decimal Offsets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collision-resistant decimal assignment (.01 to .99) allowing 100% automated order correlation without TID entry.
            </p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-blue-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Role-Based Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bcrypt credentials, 5-attempt brute-force lockouts, RFC 6238 TOTP 2FA, and audit-logged merchant impersonation.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto py-6 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>&copy; 2026 PaisaBridge PK. Production-grade Hybrid SaaS Architecture.</div>
        <div className="flex items-center space-x-6">
          <Link href="/login" className="hover:text-slate-300 transition">
            Sign In
          </Link>
          <Link href="/setup" className="hover:text-slate-300 transition">
            Setup
          </Link>
        </div>
      </footer>
    </div>
  );
}
