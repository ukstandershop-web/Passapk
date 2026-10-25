import { getDb } from '@/lib/db';
import { User } from '@paisabridge/shared';
import Link from 'next/link';
import { SetupForm } from './SetupForm';
import { ShieldCheck, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const db = getDb();
  let ownerExists = false;

  try {
    const owner = await db.selectOne<User>('users', {
      columns: ['id'],
      filters: { role: 'owner' },
    });
    ownerExists = !!owner;
  } catch (err) {
    console.error('Failed to check existing owner:', err);
  }

  if (ownerExists) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Setup Is Locked</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The initial super-administrator has already been provisioned for this platform. For security,
            the initial setup portal is permanently deactivated.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
          >
            Go to Platform Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PaisaBridge PK</h1>
            <p className="text-slate-400 text-xs">Initial Platform Owner Setup</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 text-xs text-slate-300 leading-relaxed">
          <strong>Important:</strong> You are setting up the primary super-administrator account. This
          account has unrestricted access to all gateway settings, merchant accounts, and platform fees.
          Once created, this setup route is permanently disabled.
        </div>

        <SetupForm />
      </div>
    </div>
  );
}
