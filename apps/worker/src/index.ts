import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, AppContextVariables } from './types';
import payments from './routes/payments';
import checkout from './routes/checkout';
import bridge from './routes/bridge';
import { handleScheduled } from './cron';
import { DynamicSettingsService, testParserRule } from '@paisabridge/shared';
import { CacheService } from './cache';

const app = new Hono<{ Bindings: Env; Variables: AppContextVariables }>();

// Enable CORS for public checkout and API integration
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-device-key',
      'x-internal-timestamp',
      'x-internal-signature',
    ],
  })
);

import { getDb } from './db';

// Health check endpoint (checks worker and db connectivity)
app.get('/health', async (c) => {
  const db = getDb(c.env);
  const dbHealth = await db.checkHealth();
  const isHealthy = dbHealth.status === 'ok';

  return c.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      service: 'PaisaBridge-Worker',
      time: new Date().toISOString(),
      version: '1.0.0',
      database: dbHealth,
    },
    isHealthy ? 200 : 503
  );
});

// Admin DB health check endpoint
app.get('/api/admin/db-health', async (c) => {
  const db = getDb(c.env);
  const dbHealth = await db.checkHealth();
  return c.json({
    proxy_url: c.env.PROXY_BASE_URL,
    project_name: c.env.PROXY_PROJECT_NAME || 'all',
    uses_service_binding: !!c.env.PROXY_SERVICE,
    health: dbHealth,
  }, dbHealth.status === 'ok' ? 200 : 503);
});

// Settings version endpoint
app.get('/v1/settings/version', async (c) => {
  const db = getDb(c.env);
  const cache = new CacheService(c.env);
  const settingsService = new DynamicSettingsService(db, c.env.ENCRYPTION_SECRET, cache);
  const version = await settingsService.getGlobalVersion();
  return c.json({ version });
});

// Public general settings endpoint (cached)
app.get('/public/settings/general', async (c) => {
  const db = getDb(c.env);
  const cache = new CacheService(c.env);
  const settingsService = new DynamicSettingsService(db, c.env.ENCRYPTION_SECRET, cache);
  const general = await settingsService.get('general_config');
  c.header('Cache-Control', 'public, max-age=60');
  return c.json(general || {});
});

// Test parser rule with pasted SMS text endpoint ("paste SMS and test")
app.post('/v1/settings/test-parser', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { rule, sms_text } = body;
  if (!rule || !sms_text) {
    return c.json({ error: 'Missing rule or sms_text parameter' }, 400);
  }

  const result = testParserRule(rule, sms_text);
  return c.json(result);
});

// Mount modular sub-routers
app.route('/v1/payments', payments);
app.route('/public/pay', checkout);
app.route('/bridge', bridge);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Unhandled Worker error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
