import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { MerchantBranding } from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();
    let branding = await db.selectOne<MerchantBranding>('merchant_branding', {
      merchant_id: session.merchantId,
    });

    if (!branding) {
      branding = {
        merchant_id: session.merchantId,
        brand_color: '#059669',
        welcome_message: 'Please transfer the exact PKR amount shown below.',
        show_timer: true,
      };
    }

    return NextResponse.json({ success: true, branding });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch branding' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const body = await request.json();
    const { logo_url, brand_color, welcome_message, success_url, cancel_url, show_timer } = body;

    const db = getDb();
    const existing = await db.selectOne<MerchantBranding>('merchant_branding', {
      merchant_id: session.merchantId,
    });

    const payload = {
      merchant_id: session.merchantId,
      logo_url: logo_url || null,
      brand_color: brand_color || '#059669',
      welcome_message: welcome_message || null,
      success_url: success_url || null,
      cancel_url: cancel_url || null,
      show_timer: show_timer !== false,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      result = await db.update<MerchantBranding>(
        'merchant_branding',
        { merchant_id: session.merchantId },
        payload
      );
    } else {
      result = await db.insert<MerchantBranding>('merchant_branding', payload);
    }

    return NextResponse.json({ success: true, branding: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save branding' }, 500);
  }
}
