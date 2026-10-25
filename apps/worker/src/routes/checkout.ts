import { Hono } from 'hono';
import { Env, AppContextVariables } from '../types';
import {
  CheckoutStatusResponse,
  Transaction,
  PaymentAccount,
  Merchant,
} from '@paisabridge/shared';
import { CacheService } from '../cache';
import { getDb } from '../db';

const checkout = new Hono<{ Bindings: Env; Variables: AppContextVariables }>();

/**
 * GET /public/pay/:token
 * Returns full checkout session details including merchant branding, exact final amount, and account info.
 */
checkout.get('/:token', async (c) => {
  const token = c.req.param('token');
  if (!token || token.length < 10) {
    return c.json({ error: 'Invalid checkout token' }, 400);
  }

  const db = getDb(c.env);

  // 1. Fetch transaction by token
  const tx = await db.selectOne<Transaction>('transactions', {
    filters: { token },
  });

  if (!tx) {
    return c.json({ error: 'Payment session not found or invalid' }, 404);
  }

  // 2. Fetch merchant and branding
  const merchant = await db.selectOne<Merchant>('merchants', {
    filters: { id: tx.merchant_id },
  });

  // 3. Fetch payment account instructions
  const account = await db.selectOne<PaymentAccount>('payment_accounts', {
    filters: { id: tx.account_id },
  });

  const now = Date.now();
  const expiresAtMs = new Date(tx.expires_at).getTime();
  const isExpired = tx.status === 'PENDING' && now > expiresAtMs;
  const currentStatus = isExpired ? 'EXPIRED' : tx.status.toLowerCase();

  return c.json({
    id: tx.id,
    order_id: tx.order_id,
    merchant_id: tx.merchant_id,
    merchant_name: merchant?.business_name || merchant?.name || 'PaisaBridge Merchant',
    merchant_logo: merchant?.logo_url || null,
    merchant_color: merchant?.brand_color || '#059669',
    message: merchant?.checkout_message || 'Please send the exact amount via mobile banking or wallet.',
    return_url: tx.return_url || merchant?.return_url || null,
    base_amount: Number(tx.base_amount || tx.total_amount),
    final_amount: Number(tx.total_amount),
    decimal_offset: Number(tx.decimal_offset || 0),
    account_provider: account?.method || 'bank_transfer',
    account_title: account?.account_title || 'Merchant Account',
    account_number: account?.account_number || '',
    status: currentStatus,
    expires_at: tx.expires_at,
  });
});

/**
 * POST /public/pay/:token/manual
 * Allows customer to submit manual payment claim (TID + optional screenshot) when expired or pending
 */
checkout.post('/:token/manual', async (c) => {
  const token = c.req.param('token');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { tid, screenshot_url } = body;
  if (!tid) {
    return c.json({ error: 'Transaction ID (TID) is required' }, 400);
  }

  const db = getDb(c.env);
  const tx = await db.selectOne<Transaction>('transactions', {
    filters: { token },
  });

  if (!tx) {
    return c.json({ error: 'Payment session not found' }, 404);
  }

  // Update transaction status to FLAGGED and store manual claim
  await db.update('transactions', {
    status: 'FLAGGED',
    metadata: {
      ...(tx.metadata || {}),
      manual_claim_tid: tid,
      manual_claim_screenshot: screenshot_url || null,
      manual_claimed_at: new Date().toISOString(),
    },
  }, { id: tx.id });

  return c.json({ success: true, message: 'Payment claim submitted for review' });
});

/**
 * GET /public/pay/:token/status
 * High-frequency polling endpoint for hosted checkout page
 */
checkout.get('/:token/status', async (c) => {
  const token = c.req.param('token');
  if (!token || token.length < 10) {
    return c.json({ error: 'Invalid checkout token' }, 400);
  }

  const cache = new CacheService(c.env);
  const cacheKey = `status:${token}`;

  const cached = await cache.get<CheckoutStatusResponse>(cacheKey);
  if (cached) {
    c.header('Cache-Control', 'public, max-age=2, stale-while-revalidate=1');
    return c.json(cached);
  }

  const db = getDb(c.env);
  const tx = await db.selectOne<Transaction>('transactions', {
    columns: ['id', 'status', 'total_amount', 'currency', 'expires_at', 'paid_at', 'account_id', 'created_at'],
    filters: { token },
  });

  if (!tx) {
    return c.json({ error: 'Checkout session not found or invalid' }, 404);
  }

  const account = await db.selectOne<PaymentAccount>('payment_accounts', {
    columns: ['method', 'account_title', 'account_number', 'bank_name'],
    filters: { id: tx.account_id },
  });

  const now = Date.now();
  const expiresAtMs = new Date(tx.expires_at).getTime();
  const createdAtMs = new Date(tx.created_at).getTime();
  const isExpired = tx.status === 'PENDING' && now > expiresAtMs;
  const currentStatus = isExpired ? 'EXPIRED' : tx.status;

  const elapsedSec = (now - createdAtMs) / 1000;
  let nextInterval = 3;
  if (elapsedSec > 300) {
    nextInterval = 10;
  } else if (elapsedSec > 60) {
    nextInterval = 5;
  }

  const responseBody: CheckoutStatusResponse = {
    status: currentStatus,
    total_amount: Number(tx.total_amount),
    currency: tx.currency || 'PKR',
    expires_at: tx.expires_at,
    is_expired: isExpired,
    paid_at: tx.paid_at || null,
    method: account?.method || 'bank_transfer',
    account_title: account?.account_title || 'Merchant Account',
    account_number: account?.account_number || '',
    bank_name: account?.bank_name || null,
    next_poll_interval_seconds: nextInterval,
  };

  const ttl = ['PAID', 'EXPIRED', 'CANCELLED', 'SUCCESS'].includes(currentStatus) ? 10 : 2;
  await cache.set(cacheKey, responseBody, ttl);

  c.header('Cache-Control', `public, max-age=${ttl}`);
  return c.json(responseBody);
});

export default checkout;
