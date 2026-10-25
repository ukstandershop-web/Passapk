import React from 'react';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { redirect } from 'next/navigation';
import TeamManager from './TeamManager';
import { StaffPermission } from '@paisabridge/shared';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await getSession();
  if (!session || !session.merchantId) {
    redirect('/login');
  }

  const db = getDb();
  let team: any[] = [];

  try {
    const staffUsers = await db.select<any>('users', {
      filters: { merchant_id: session.merchantId, role: 'merchant_staff' },
      order: { column: 'created_at', ascending: false },
    });

    team = await Promise.all(
      staffUsers.map(async (u) => {
        const perms = await db.selectOne<StaffPermission>('staff_permissions', {
          user_id: u.id,
        });
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          created_at: u.created_at,
          permissions: perms || {
            user_id: u.id,
            can_view_transactions: true,
            can_manage_accounts: false,
            can_manage_bridge: false,
            can_view_analytics: false,
            can_export_reports: false,
            can_manage_webhooks: false,
          },
        };
      })
    );
  } catch (err) {
    console.error('Error fetching team members:', err);
  }

  return <TeamManager initialTeam={team} />;
}
