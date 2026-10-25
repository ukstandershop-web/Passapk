import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { hashPassword, StaffPermission } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId || session.role !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized. Only primary merchants can manage team.' }, 403);
    }

    const db = getDb();
    // Fetch users belonging to this merchant with role 'merchant_staff'
    const staffUsers = await db.select<any>('users', {
      filters: { merchant_id: session.merchantId, role: 'merchant_staff' },
      order: { column: 'created_at', ascending: false },
    });

    // Fetch permissions for each staff member
    const team = await Promise.all(
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

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch team members' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId || session.role !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized' }, 403);
    }

    const body = await request.json();
    const { email, password, permissions } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and initial password are required' }, 400);
    }

    const db = getDb();

    // Check if user already exists
    const existing = await db.selectOne<any>('users', { email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, 400);
    }

    const passwordHash = await hashPassword(password);

    // Create user with merchant_staff role
    const newUser = await db.insert<any>('users', {
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'merchant_staff',
      merchant_id: session.merchantId,
      is_active: true,
      email_verified: true,
    });

    // Create permissions record
    const staffPerms = await db.insert<StaffPermission>('staff_permissions', {
      user_id: newUser.id,
      can_view_transactions: permissions?.can_view_transactions !== false,
      can_manage_accounts: !!permissions?.can_manage_accounts,
      can_manage_bridge: !!permissions?.can_manage_bridge,
      can_view_analytics: !!permissions?.can_view_analytics,
      can_export_reports: !!permissions?.can_export_reports,
      can_manage_webhooks: !!permissions?.can_manage_webhooks,
    });

    return NextResponse.json(
      {
        success: true,
        member: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          created_at: newUser.created_at,
          permissions: staffPerms,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add team member' }, 500);
  }
}
