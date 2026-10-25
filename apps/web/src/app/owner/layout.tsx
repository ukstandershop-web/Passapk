import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Store, 
  FileCheck, 
  CreditCard, 
  Cpu, 
  Wrench, 
  Settings, 
  ShieldAlert, 
  Activity, 
  FileText,
  LogOut,
  Webhook
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== 'owner') {
    redirect('/login?redirect=/owner');
  }

  const navItems = [
    { label: 'Overview', href: '/owner', icon: LayoutDashboard },
    { label: 'Merchants', href: '/owner/merchants', icon: Store },
    { label: 'Payment Proofs', href: '/owner/proofs', icon: FileCheck },
    { label: 'Plans & Pricing', href: '/owner/plans', icon: CreditCard },
    { label: 'Bridge Devices', href: '/owner/devices', icon: Cpu },
    { label: 'Parser Rules', href: '/owner/parser', icon: Wrench },
    { label: 'Webhook Logs', href: '/owner/webhooks', icon: Webhook },
    { label: 'Governance & Audit', href: '/owner/governance', icon: ShieldAlert },
    { label: 'System Health', href: '/owner/health', icon: Activity },
    { label: 'Platform Settings', href: '/owner/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-indigo-400">PaisaBridge PK</h1>
            <p className="text-xs text-slate-400">Superadmin Console</p>
          </div>
          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30">Owner</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Icon className="w-4 h-4 text-indigo-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
              {session.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.name || 'Owner'}</p>
              <p className="text-xs text-slate-400 truncate">{session.email}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700 hover:border-rose-500/30"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-slate-950">
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">{children}</div>
      </main>
    </div>
  );
}
