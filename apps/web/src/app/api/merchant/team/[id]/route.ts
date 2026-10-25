import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { StaffPermission } from '@paisabridge/shared';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId || session.role !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = params.id;
    const db = getDb();

    // Verify user belongs to this merchant
    const user = await db.selectOne<any>('users', {
      id: userId,
      merchant_id: session.merchantId,
    });

    if (!user) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Delete user (cascade deletes permissions)
    await db.delete('users', { id: userId, merchant_id: session.merchantId });

    return NextResponse.json({ success: true, message: 'Team member removed' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove team member' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId || session.role !== 'merchant') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = params.id;
    const body = await request.json();
    const { permissions } = body;

    const db = getDb();
    const user = await db.selectOne<any>('users', {
      id: userId,
      merchant_id: session.merchantId,
    });

    if (!user) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const updatedPerms = await db.update<StaffPermission>(
      'staff_permissions',
      { user_id: userId },
      {
        can_view_transactions: !!permissions?.can_view_transactions,
        can_manage_accounts: !!permissions?.can_manage_accounts,
        can_manage_bridge: !!permissions?.can_manage_bridge,
        can_view_analytics: !!permissions?.can_view_analytics,
        can_export_reports: !!permissions?.can_export_reports,
        can_manage_webhooks: !!permissions?.can_manage_webhooks,
        updated_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({ success: true, permissions: updatedPerms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update permissions' }, { status: 500 });
  }
}
