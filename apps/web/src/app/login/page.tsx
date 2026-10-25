import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    if (session.role === 'owner') {
      redirect('/owner');
    } else {
      redirect('/merchant');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PaisaBridge PK</h1>
            <p className="text-slate-400 text-xs">Custom Payment Gateway SaaS</p>
          </div>
        </div>

        <LoginForm />

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500">
            Need to set up the initial super-admin?{' '}
            <Link href="/setup" className="text-emerald-400 hover:underline">
              Go to /setup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
