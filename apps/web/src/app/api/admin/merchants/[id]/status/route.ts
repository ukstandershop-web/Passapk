import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { User } from '@paisabridge/shared';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Owner role required' }, { status: 403 });
    }

    const merchantId = params.id;
    const body = await request.json();
    const { status, reason } = body;

    if (!['active', 'suspended', 'banned'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: 'active', 'suspended', 'banned'" },
        { status: 400 }
      );
    }

    const db = getDb();

    // 1. Update merchant status
    await db.update(
      'merchants',
      { id: merchantId },
      {
        status,
        is_active: status === 'active',
        updated_at: new Date().toISOString(),
      }
    );

    // 2. If suspending or banning, immediately revoke all merchant and staff sessions
    if (status !== 'active') {
      const merchantUsers = await db.select<User>('users', {
        columns: ['id', 'token_version'],
        filters: { merchant_id: merchantId },
      });

      for (const u of merchantUsers) {
        await db.update(
          'users',
          { id: u.id },
          { token_version: (u.token_version || 1) + 1 }
        );
      }
    }

    // 3. Log admin action
    await db.insert('auth_logs', {
      user_id: session.userId,
      email: session.email,
      action: `merchant_${status}`,
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
      metadata: { target_merchant_id: merchantId, reason: reason || 'Admin action' },
    });

    return NextResponse.json({
      success: true,
      message: `Merchant status updated to ${status}. Sessions updated.`,
      merchantId,
      status,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Status update failed' }, { status: 500 });
  }
}
