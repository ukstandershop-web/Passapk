import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProfileSecurityManager from './ProfileSecurityManager';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login');
  }

  const db = getDb();
  let totpEnabled = false;
  let logs: any[] = [];

  try {
    const user = await db.selectOne<any>('users', { id: session.userId });
    totpEnabled = !!user?.totp_enabled;

    logs = await db.select<any>('auth_logs', {
      filters: { user_id: session.userId },
      order: { column: 'created_at', ascending: false },
      limit: 10,
    });
  } catch (err) {
    console.error('Error fetching profile data:', err);
  }

  return (
    <ProfileSecurityManager
      userEmail={session.email}
      userRole={session.role}
      merchantId={session.merchantId}
      totpEnabled={totpEnabled}
      initialLogs={logs}
    />
  );
}
