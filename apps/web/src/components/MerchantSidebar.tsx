'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Smartphone,
  Key,
  Webhook,
  Receipt,
  AlertTriangle,
  Inbox,
  Palette,
  ReceiptText,
  Users,
  Code2,
  Bell,
  UserCheck,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Compass,
} from 'lucide-react';

interface MerchantSidebarProps {
  businessName: string;
  email: string;
  role: string;
  bridgeOnline: boolean;
  bridgeBattery?: number;
  lastHeartbeat?: string;
}

export function MerchantSidebar({
  businessName,
  email,
  role,
  bridgeOnline,
  bridgeBattery,
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/merchant', icon: LayoutDashboard },
    { label: 'Onboarding Wizard', href: '/merchant/onboarding', icon: Compass },
    { label: 'Payment Accounts', href: '/merchant/accounts', icon: CreditCard },
    { label: 'Bridge Devices', href: '/merchant/devices', icon: Smartphone },
    { label: 'Transactions', href: '/merchant/transactions', icon: Receipt },
    { label: 'Flagged Payments', href: '/merchant/flagged', icon: AlertTriangle },
    { label: 'Unmatched Inbox', href: '/merchant/notifications', icon: Inbox },
    { label: 'API Keys', href: '/merchant/api-keys', icon: Key },
    { label: 'Webhooks', href: '/merchant/webhooks', icon: Webhook },
    { label: 'Checkout Branding', href: '/merchant/branding', icon: Palette },
    { label: 'Billing & Plan', href: '/merchant/billing', icon: ReceiptText },
    { label: 'Team Members', href: '/merchant/team', icon: Users },
    { label: 'API Docs & Sandbox', href: '/merchant/docs', icon: Code2 },
    { label: 'Alert Preferences', href: '/merchant/alerts', icon: Bell },
    { label: 'Profile & Security', href: '/merchant/profile', icon: UserCheck },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">PaisaBridge PK</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/merchant" className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight leading-none">PaisaBridge</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Merchant Console</div>
            </div>
          </Link>
        </div>

        {/* Live Bridge Phone Status Pill */}
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Bridge Phone:</span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  bridgeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  bridgeOnline ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {bridgeOnline ? 'Online' : 'Offline'}
              </span>
              {bridgeBattery !== undefined && (
                <span className="text-[10px] text-slate-500">({bridgeBattery}%)</span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Account / Sign Out Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="overflow-hidden mr-2">
            <div className="text-xs font-bold text-white truncate">{businessName}</div>
            <div className="text-[10px] text-slate-400 truncate">{email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
