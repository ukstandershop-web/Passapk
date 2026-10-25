import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { hmacSha256Hex, Merchant, WebhookJob } from '@paisabridge/shared';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const db = getDb();
    const merchant = await db.selectOne<Merchant>('merchants', { id: session.merchantId });
    if (!merchant || !merchant.webhook_url) {
      return NextResponse.json({ error: 'Please configure a Webhook URL first' }, 400);
    }

    const testPayload = {
      event: 'payment.paid',
      data: {
        id: 'txn_test_' + Math.random().toString(36).substring(2, 10),
        order_id: 'order_test_101',
        amount: 1500.25,
        currency: 'PKR',
        status: 'PAID',
        method: 'jazzcash',
        paid_at: new Date().toISOString(),
        test_mode: true,
      },
      timestamp: Math.floor(Date.now() / 1000),
    };

    const payloadString = JSON.stringify(testPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await hmacSha256Hex(merchant.webhook_secret, `${timestamp}.${payloadString}`);
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    const startTime = Date.now();
    let responseStatus = 0;
    let responseText = '';
    let isSuccess = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(merchant.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PaisaBridge-Signature': signatureHeader,
          'User-Agent': 'PaisaBridge-Webhook-Deliverer/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      responseStatus = res.status;
      responseText = await res.text();
      isSuccess = res.ok;
    } catch (e: any) {
      errorMessage = e.name === 'AbortError' ? 'Timeout (8000ms exceeded)' : e.message;
    }

    const latencyMs = Date.now() - startTime;

    // Record job in webhook_jobs
    const job = await db.insert<WebhookJob>('webhook_jobs', {
      merchant_id: session.merchantId,
      transaction_id: '00000000-0000-0000-0000-000000000000',
      event: 'payment.test',
      payload: testPayload,
      target_url: merchant.webhook_url,
      secret: merchant.webhook_secret,
      status: isSuccess ? 'delivered' : 'failed',
      attempt_count: 1,
      max_attempts: 5,
      next_retry_at: new Date().toISOString(),
      last_status_code: responseStatus || null,
      last_error: errorMessage || (isSuccess ? null : `HTTP ${responseStatus}`),
    });

    return NextResponse.json({
      success: isSuccess,
      status_code: responseStatus,
      latency_ms: latencyMs,
      response_body: responseText.slice(0, 1000),
      error: errorMessage,
      job,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to dispatch test webhook' }, 500);
  }
}
