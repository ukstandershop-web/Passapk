import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const deviceId = params.id;
    const db = getDb();

    await db.delete('bridge_devices', {
      id: deviceId,
      merchant_id: session.merchantId,
    });

    return NextResponse.json({ success: true, message: 'Bridge device revoked successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revoke device' }, 500);
  }
}
