import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { generateSecureToken, sha256Hex, MerchantApiKey } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const keys = await db.select<MerchantApiKey>('merchant_api_keys', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
    });

    return NextResponse.json({ success: true, keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, is_live, ip_whitelist } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const live = is_live !== false; // default true
    const publicPrefix = live ? 'pk_live_' : 'pk_test_';
    const secretPrefix = live ? 'sk_live_' : 'sk_test_';

    const publicKey = generateSecureToken(publicPrefix, 20);
    const rawSecret = generateSecureToken(secretPrefix, 32);
    const secretHash = await sha256Hex(rawSecret);

    // Clean up IP whitelist array
    const ips = Array.isArray(ip_whitelist)
      ? ip_whitelist.map((ip: string) => ip.trim()).filter((ip: string) => ip.length > 0)
      : typeof ip_whitelist === 'string'
      ? ip_whitelist.split(',').map((ip) => ip.trim()).filter(Boolean)
      : [];

    const db = getDb();
    const newKey = await db.insert<MerchantApiKey>('merchant_api_keys', {
      merchant_id: session.merchantId,
      name: name.trim(),
      public_key: publicKey,
      secret_hash: secretHash,
      secret_prefix: rawSecret.slice(0, 14),
      is_live: live,
      is_active: true,
      ip_whitelist: ips,
    });

    return NextResponse.json({
        success: true,
        key: newKey,
        raw_secret: rawSecret, // Displayed ONCE to user
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate API key' }, { status: 500 });
  }
}
