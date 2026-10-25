import { Env } from '../types';
import {
  hmacSha256Hex,
  WebhookJob,
} from '@paisabridge/shared';
import { getDb } from '../db';

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  const db = getDb(env);
  const nowIso = new Date().toISOString();

  // --------------------------------------------------------------------------
  // 1. Expire overdue pending transactions and free decimal reservations
  // --------------------------------------------------------------------------
  try {
    await db.rpc('expire_overdue_transactions');
  } catch (err) {
    console.error('Failed to expire overdue transactions:', err);
  }

  // --------------------------------------------------------------------------
  // 2. Process Webhook Dispatch & Retry Queue (Batch of up to 10 jobs)
  // --------------------------------------------------------------------------
  try {
    const jobs = await db.select<WebhookJob>('webhook_jobs', {
      filters: [
        { column: 'status', operator: 'in', value: ['queued', 'retrying'] },
        { column: 'next_retry_at', operator: 'lte', value: nowIso },
      ],
      limit: 10,
    });

    if (jobs && jobs.length > 0) {
      await Promise.allSettled(
        jobs.map(async (job) => {
          const payloadStr = JSON.stringify(job.payload);
          const signature = await hmacSha256Hex(job.secret, payloadStr);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

            const response = await fetch(job.target_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PaisaBridge-Webhook-Engine/1.0',
                'x-signature-sha256': signature,
                'x-event': job.event,
                'x-transaction-id': job.transaction_id,
              },
              body: payloadStr,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              await db.update(
                'webhook_jobs',
                { id: job.id },
                {
                  status: 'delivered',
                  attempt_count: job.attempt_count + 1,
                  last_status_code: response.status,
                  last_error: null,
                  updated_at: new Date().toISOString(),
                }
              );
            } else {
              throw new Error(`Target responded with status ${response.status}`);
            }
          } catch (deliveryError: any) {
            const newAttempt = job.attempt_count + 1;
            const isFinalFailure = newAttempt >= job.max_attempts;

            // Exponential backoff: 1m, 2m, 4m, 8m, 16m
            const backoffSeconds = Math.pow(2, newAttempt) * 60;
            const nextRetryIso = new Date(Date.now() + backoffSeconds * 1000).toISOString();

            await db.update(
              'webhook_jobs',
              { id: job.id },
              {
                status: isFinalFailure ? 'failed' : 'retrying',
                attempt_count: newAttempt,
                next_retry_at: nextRetryIso,
                last_error: deliveryError?.message || 'Delivery error',
                updated_at: new Date().toISOString(),
              }
            );
          }
        })
      );
    }
  } catch (webhookErr) {
    console.error('Failed to process webhook retry queue:', webhookErr);
  }

  // --------------------------------------------------------------------------
  // 3. Hourly Maintenance: Cleanup old raw notifications (older than 7 days)
  // --------------------------------------------------------------------------
  const currentMinute = new Date().getUTCMinutes();
  if (currentMinute === 0) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await db.delete('raw_notifications', [
        { column: 'created_at', operator: 'lt', value: sevenDaysAgo },
      ]);
    } catch (cleanupErr) {
      console.error('Failed to cleanup old raw notifications:', cleanupErr);
    }
  }
}
