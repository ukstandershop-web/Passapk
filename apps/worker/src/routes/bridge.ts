import { Hono } from 'hono';
import { Env, AppContextVariables } from '../types';
import {
  BridgeNotifySchema,
  BridgeHeartbeatSchema,
  parseNotification,
  parseWithDynamicRules,
  DynamicSettingsService,
} from '@paisabridge/shared';
import { requireBridgeAuth } from '../middleware/auth';
import { CacheService } from '../cache';
import { getDb } from '../db';

const bridge = new Hono<{ Bindings: Env; Variables: AppContextVariables }>();

bridge.use('*', requireBridgeAuth);

/**
 * POST /bridge/notify
 * Android bridge app submits captured SMS / Push notification payload
 */
bridge.post('/notify', async (c) => {
  const device = c.get('device')!;
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = BridgeNotifySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 422);
  }

  const { package_name, title, content, post_time } = parsed.data;
  const db = getDb(c.env);
  const cache = new CacheService(c.env);

  // 1. Fetch dynamic parser rules from cache or settings table
  let dynamicRules = await cache.get<any[]>('setting:parser_rules');
  if (!dynamicRules) {
    const settingsService = new DynamicSettingsService(db, c.env.ENCRYPTION_SECRET, cache);
    dynamicRules = await settingsService.get<any[]>('parser_rules');
  }

  // Run notification parser using dynamic or fallback rules
  const parsedNotification = dynamicRules && dynamicRules.length > 0
    ? parseWithDynamicRules(package_name, title, content, dynamicRules)
    : parseNotification(package_name, title, content);

  // If not financial, return without creating match overhead
  if (!parsedNotification.is_financial || !parsedNotification.amount) {
    return c.json({
      success: true,
      matched: false,
      is_financial: false,
      message: 'Notification analyzed: non-financial or amount could not be extracted.',
    });
  }

  // 2. Call atomic match RPC in database via shared adapter
  try {
    const rpcResult = await db.rpc<{
      matched: boolean;
      transaction_id: string | null;
      order_id: string | null;
      raw_notification_id: string;
    }>('atomic_match_notification', {
      p_device_id: device.id,
      p_merchant_id: device.merchant_id,
      p_package: package_name,
      p_title: title || '',
      p_content: content,
      p_post_time: post_time,
      p_amount: parsedNotification.amount,
      p_sms_ref: parsedNotification.tid || null,
      p_sender: parsedNotification.sender || null,
    });

    return c.json({
      success: true,
      matched: rpcResult.matched,
      transaction_id: rpcResult.transaction_id,
      order_id: rpcResult.order_id,
      extracted: {
        amount: parsedNotification.amount,
        tid: parsedNotification.tid,
        sender: parsedNotification.sender,
        method: parsedNotification.method,
      },
    });
  } catch (err: any) {
    return c.json(
      { error: 'Failed to process notification matching', details: err.message },
      500
    );
  }
});

/**
 * POST /bridge/heartbeat
 * Android bridge phone reports telemetry (battery, status)
 * Database writes are throttled to save proxy & DB limits
 */
bridge.post('/heartbeat', async (c) => {
  const device = c.get('device')!;
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const parsed = BridgeHeartbeatSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 422);
  }

  const { battery_level, is_charging, app_version } = parsed.data;
  const cache = new CacheService(c.env);
  const now = Date.now();

  const lastWriteKey = `device_last_db_write:${device.id}`;
  const lastWrite = (await cache.get<number>(lastWriteKey)) || 0;
  const throttleMs = 120 * 1000; // default 120s write throttle

  if (now - lastWrite >= throttleMs) {
    const db = getDb(c.env);

    try {
      await db.update(
        'bridge_devices',
        { id: device.id },
        {
          battery_level,
          is_charging,
          app_version: app_version || device.app_version,
          last_heartbeat_at: new Date(now).toISOString(),
          last_db_write_at: new Date(now).toISOString(),
        }
      );
      await cache.set(lastWriteKey, now, 300);
    } catch (err: any) {
      console.error('Failed to update bridge heartbeat in DB:', err.message);
    }
  }

  return c.json({
    success: true,
    status: 'online',
    server_time: now,
  });
});

/**
 * GET /bridge/config
 * Retrieves allowed package list and settings for the bridge app
 */
bridge.get('/config', async (c) => {
  const cache = new CacheService(c.env);
  const cacheKey = 'setting:bridge_config';

  let config = await cache.get<SystemSettingsBridgeConfig>(cacheKey);

  if (!config) {
    const db = getDb(c.env);

    try {
      const data = await db.selectOne<SystemSetting<SystemSettingsBridgeConfig>>('system_settings', {
        columns: ['value'],
        filters: { key: 'bridge_config' },
      });

      if (data?.value) {
        config = data.value;
        await cache.set(cacheKey, config, 300);
      }
    } catch (err: any) {
      console.error('Failed to load bridge config:', err.message);
    }
  }

  return c.json({
    allowed_packages: config?.allowed_packages || [
      'com.techlogix.mobilinkcustomer',
      'com.telenor.pakistan.easypaisa',
      'com.nayapay.live',
      'pk.com.sadapay',
      'com.meezanbank.mbbl',
      'com.ofss.fcdb.mobile.android.b001',
      'com.bankalfalah.artemismfpa',
      'com.faysalbank.faysaldigital',
      'com.mcb.mbusiness',
      'com.android.mms',
      'com.google.android.apps.messaging',
    ],
    heartbeat_interval_seconds: config?.heartbeat_interval_seconds || 120,
    low_usage_mode: config?.low_usage_mode || false,
  });
});

export default bridge;
