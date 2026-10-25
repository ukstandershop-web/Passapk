import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { generateSecureToken, Merchant, WebhookJob } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const logs = await db.select<WebhookJob>('webhook_jobs', {
      filters: { merchant_id: session.merchantId },
      order: { column: 'created_at', ascending: false },
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      webhook_url: merchant.webhook_url || '',
      webhook_secret: merchant.webhook_secret || '',
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhook_url, regenerate_secret } = body;

    const db = getDb();
    const updates: Partial<Merchant> = {};

    if (webhook_url !== undefined) {
      // Validate URL format if not empty
      if (webhook_url && !webhook_url.startsWith('http://') && !webhook_url.startsWith('https://')) {
        return NextResponse.json({ error: 'Webhook URL must start with https:// or http://' }, { status: 400 });
      }
      updates.webhook_url = webhook_url.trim() || null;
    }

    if (regenerate_secret) {
      updates.webhook_secret = generateSecureToken('whsec', 24);
    }

    const updated = await db.update<Merchant>(
      'merchants',
      { id: session.merchantId },
      updates
    );

    return NextResponse.json({
      success: true,
      webhook_url: updated.webhook_url,
      webhook_secret: updated.webhook_secret,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update webhook config' }, { status: 500 });
  }
}
