import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { generateSecureToken, sha256Hex, MerchantApiKey } from '@paisabridge/shared';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = params.id;
    const db = getDb();

    await db.delete('merchant_api_keys', {
      id: keyId,
      merchant_id: session.merchantId,
    });

    return NextResponse.json({ success: true, message: 'API key revoked permanently' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revoke API key' }, { status: 500 });
  }
}

// Rotate key: creates a new secret for this key and returns it once
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = params.id;
    const db = getDb();

    // Fetch existing key to know live status
    const existing = await db.selectOne<MerchantApiKey>('merchant_api_keys', {
      id: keyId,
      merchant_id: session.merchantId,
    });

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const secretPrefix = existing.is_live ? 'sk_live_' : 'sk_test_';
    const newRawSecret = generateSecureToken(secretPrefix, 32);
    const newSecretHash = await sha256Hex(newRawSecret);

    const updated = await db.update<MerchantApiKey>(
      'merchant_api_keys',
      { id: keyId, merchant_id: session.merchantId },
      {
        secret_hash: newSecretHash,
        secret_prefix: newRawSecret.slice(0, 14),
      }
    );

    return NextResponse.json({
      success: true,
      key: updated,
      new_raw_secret: newRawSecret,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to rotate API key' }, { status: 500 });
  }
}
