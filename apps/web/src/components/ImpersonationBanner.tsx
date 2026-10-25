'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';

interface ImpersonationBannerProps {
  businessName?: string;
}

export function ImpersonationBanner({ businessName }: ImpersonationBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/impersonate/exit', { method: 'POST' });
      if (res.ok) {
        router.push('/owner/merchants');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-sm flex items-center justify-between shadow-md z-50 sticky top-0">
      <div className="flex items-center space-x-2 font-medium">
        <ShieldAlert className="w-4 h-4 text-amber-200" />
        <span>
          <strong>Impersonation Active:</strong> You are viewing {businessName || 'this merchant'} as an Administrator. All actions are audit-logged.
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={loading}
        className="flex items-center space-x-1.5 bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-xs font-semibold tracking-wide transition uppercase"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{loading ? 'Exiting...' : 'Exit Impersonation'}</span>
      </button>
    </div>
  );
}
