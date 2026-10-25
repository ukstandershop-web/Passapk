import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { generateSecureToken, sha256Hex, BridgeDevice } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const devices = await db.select<BridgeDevice>('bridge_devices', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });

    return NextResponse.json({ success: true, devices });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_name, device_model } = body;

    if (!device_name) {
      return NextResponse.json({ error: 'Device name is required' }, { status: 400 });
    }

    const db = getDb();

    // Generate unique credentials for the Android Bridge App
    const deviceId = generateSecureToken('dev', 12);
    const rawSecret = generateSecureToken('brg_live', 24);
    const secretHash = await sha256Hex(rawSecret);

    const workerUrl = process.env.WORKER_BASE_URL || 'https://paisabridge-worker.your-subdomain.workers.dev';

    const newDevice = await db.insert<BridgeDevice>('bridge_devices', {
      merchant_id: session.merchantId,
      device_id: deviceId,
      device_name,
      device_model: device_model || 'Android Phone',
      api_key_prefix: rawSecret.slice(0, 12),
      api_key_hash: secretHash,
      battery_level: 100,
      is_charging: false,
      is_active: true,
      last_heartbeat_at: new Date().toISOString(),
      last_db_write_at: new Date().toISOString(),
    });

    // Construct pairing config object for QR code / Bridge import
    const pairingPayload = {
      worker_url: workerUrl,
      device_id: deviceId,
      device_key: rawSecret,
      merchant_id: session.merchantId,
    };

    return NextResponse.json({
        success: true,
        device: newDevice,
        raw_secret: rawSecret,
        pairing_payload: pairingPayload,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to pair device' }, { status: 500 });
  }
}
