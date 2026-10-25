import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { hmacSha256Hex, WebhookJob } from '@paisabridge/shared';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = params.id;
    const db = getDb();

    const job = await db.selectOne<WebhookJob>('webhook_jobs', {
      id: jobId,
      merchant_id: session.merchantId,
    });

    if (!job) {
      return NextResponse.json({ error: 'Webhook job not found' }, 404);
    }

    const payloadString = typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await hmacSha256Hex(job.secret, `${timestamp}.${payloadString}`);
    const signatureHeader = `t=${timestamp},v1=${signature}`;

    let responseStatus = 0;
    let isSuccess = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(job.target_url, {
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
      isSuccess = res.ok;
    } catch (e: any) {
      errorMessage = e.name === 'AbortError' ? 'Timeout (8000ms exceeded)' : e.message;
    }

    const updatedJob = await db.update<WebhookJob>(
      'webhook_jobs',
      { id: jobId, merchant_id: session.merchantId },
      {
        status: isSuccess ? 'delivered' : 'failed',
        attempt_count: (job.attempt_count || 0) + 1,
        last_status_code: responseStatus || null,
        last_error: errorMessage || (isSuccess ? null : `HTTP ${responseStatus}`),
        updated_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      success: isSuccess,
      status_code: responseStatus,
      error: errorMessage,
      job: updatedJob,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resend webhook' }, 500);
  }
}
