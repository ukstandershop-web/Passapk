import { Context, Next } from 'hono';
import { Env, AppContextVariables } from '../types';
import { sha256Hex, verifyHmacSha256, Merchant, BridgeDevice } from '@paisabridge/shared';
import { CacheService } from '../cache';
import { getDb } from '../db';

export async function requireMerchantAuth(c: Context<{ Bindings: Env; Variables: AppContextVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization') || c.req.header('x-api-key');
  if (!authHeader) {
    return c.json({ error: 'Missing API key. Provide Authorization: Bearer <key> or x-api-key' }, 401);
  }

  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawKey) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  const keyHash = await sha256Hex(rawKey);
  const cacheKey = `merchant_key:${keyHash}`;
  const cache = new CacheService(c.env);

  let merchant = await cache.get<Merchant>(cacheKey);

  if (!merchant) {
    const db = getDb(c.env);
    try {
      const data = await db.selectOne<Merchant>('merchants', {
        filters: {
          api_key_hash: keyHash,
          is_active: true,
        },
      });

      if (!data) {
        return c.json({ error: 'Unauthorized: Invalid or inactive API key' }, 401);
      }

      merchant = data;
      await cache.set(cacheKey, merchant, 120); // Cache merchant profile for 2 mins
    } catch (err: any) {
      return c.json({ error: 'Auth check failed', details: err.message }, 500);
    }
  }

  c.set('merchant', merchant);
  await next();
}

export async function requireBridgeAuth(c: Context<{ Bindings: Env; Variables: AppContextVariables }>, next: Next) {
  const deviceKey = c.req.header('x-device-key') || c.req.header('Authorization');
  if (!deviceKey) {
    return c.json({ error: 'Missing Device key. Provide x-device-key or Authorization: Bearer <key>' }, 401);
  }

  const rawKey = deviceKey.replace(/^Bearer\s+/i, '').trim();
  const keyHash = await sha256Hex(rawKey);
  const cacheKey = `device_key:${keyHash}`;
  const cache = new CacheService(c.env);

  let device = await cache.get<BridgeDevice>(cacheKey);

  if (!device) {
    const db = getDb(c.env);
    try {
      const data = await db.selectOne<BridgeDevice>('bridge_devices', {
        filters: {
          api_key_hash: keyHash,
          is_active: true,
        },
      });

      if (!data) {
        return c.json({ error: 'Unauthorized: Invalid or inactive Bridge Device' }, 401);
      }

      device = data;
      await cache.set(cacheKey, device, 120);
    } catch (err: any) {
      return c.json({ error: 'Device auth check failed', details: err.message }, 500);
    }
  }

  c.set('device', device);
  await next();
}

export async function requireInternalAuth(c: Context<{ Bindings: Env; Variables: AppContextVariables }>, next: Next) {
  const timestamp = c.req.header('x-internal-timestamp');
  const signature = c.req.header('x-internal-signature');

  if (!timestamp || !signature) {
    return c.json({ error: 'Missing internal authentication headers' }, 401);
  }

  const tsNum = parseInt(timestamp, 10);
  const now = Date.now();
  // Allowed drift: 5 minutes
  if (isNaN(tsNum) || Math.abs(now - tsNum) > 300000) {
    return c.json({ error: 'Internal signature timestamp expired or invalid' }, 401);
  }

  const path = new URL(c.req.url).pathname;
  const message = `${timestamp}:${path}`;
  const isValid = await verifyHmacSha256(c.env.INTERNAL_SHARED_SECRET, message, signature);

  if (!isValid) {
    return c.json({ error: 'Invalid internal signature' }, 403);
  }

  await next();
}
