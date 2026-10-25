import { Hono } from 'hono';
import { Env, AppContextVariables } from '../types';
import {
  CreatePaymentSchema,
  allocateDecimalOffset,
  calculateTotalAmount,
  generateSecureToken,
  PaymentAccount,
  Transaction,
  DecimalReservation,
} from '@paisabridge/shared';
import { requireMerchantAuth } from '../middleware/auth';
import { getDb } from '../db';

const payments = new Hono<{ Bindings: Env; Variables: AppContextVariables }>();

payments.use('*', requireMerchantAuth);

/**
 * POST /v1/payments
 * Creates a payment with dynamic decimal allocation for automated matching
 */
payments.post('/', async (c) => {
  const merchant = c.get('merchant')!;
  let bodyJson: unknown;
  try {
    bodyJson = await c.req.json();
  } catch {
    return c.json({ error: 'Malformed JSON payload' }, 400);
  }

  const parsed = CreatePaymentSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 422);
  }

  const { order_id, amount, method, customer_phone, customer_email, customer_name, metadata } =
    parsed.data;

  const db = getDb(c.env);

  // 1. Fetch active payment accounts for this merchant
  const filters: Record<string, unknown> = {
    merchant_id: merchant.id,
    is_active: true,
  };
  if (method) {
    filters.method = method;
  }

  let accounts: PaymentAccount[] = [];
  try {
    accounts = await db.select<PaymentAccount>('payment_accounts', {
      filters,
      order: { column: 'priority', ascending: false },
      limit: 5,
    });
  } catch (err: any) {
    return c.json({ error: 'Failed to query payment channels', details: err.message }, 500);
  }

  if (accounts.length === 0) {
    return c.json(
      {
        error: method
          ? `No active payment account found for method '${method}'`
          : 'No active payment account configured for this merchant',
      },
      400
    );
  }

  // Select account with available daily headroom
  const account = accounts.find(
    (acc) => Number(acc.current_daily_volume) + amount <= Number(acc.daily_limit)
  ) || accounts[0];

  const token = generateSecureToken('tok', 24);
  const timeoutMinutes = 15;

  // 2. Attempt atomic reservation via RPC first
  let rpcResult: any = null;
  try {
    rpcResult = await db.rpc('reserve_decimal_offset', {
      p_merchant_id: merchant.id,
      p_account_id: account.id,
      p_order_id: order_id,
      p_base_amount: amount,
      p_token: token,
      p_customer_phone: customer_phone || null,
      p_customer_email: customer_email || null,
      p_customer_name: customer_name || null,
      p_timeout_minutes: timeoutMinutes,
      p_metadata: metadata || {},
    });
  } catch {
    rpcResult = null; // Fall back to direct queries if RPC is not yet registered
  }

  let txId: string;
  let decimalOffset: number;
  let totalAmount: number;
  let expiresAt: string;

  if (rpcResult && rpcResult.success) {
    txId = rpcResult.transaction_id;
    decimalOffset = Number(rpcResult.decimal_offset);
    totalAmount = Number(rpcResult.total_amount);
    expiresAt = rpcResult.expires_at;
  } else if (rpcResult && rpcResult.error === 'NO_DECIMAL_SLOTS') {
    return c.json(
      {
        error:
          'All decimal slots are currently occupied for this payment account. Please retry in a few moments.',
      },
      409
    );
  } else {
    // 3. Fallback: manual reservation with partial index collision check
    const nowIso = new Date().toISOString();
    const reservations = await db.select<DecimalReservation>('decimal_reservations', {
      columns: ['decimal_offset'],
      filters: {
        account_id: account.id,
        is_active: true,
      },
    });

    const reservedOffsets = reservations.map((r) => Number(r.decimal_offset));
    const allocated = allocateDecimalOffset(reservedOffsets, {
      min: 0.01,
      max: 0.99,
      strategy: 'random',
    });

    if (allocated === null) {
      return c.json(
        {
          error:
            'All decimal slots are currently occupied for this payment account. Please retry in a few moments.',
        },
        409
      );
    }

    decimalOffset = allocated;
    totalAmount = calculateTotalAmount(amount, decimalOffset);
    expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString();

    const createdTx = await db.insert<Transaction>('transactions', {
      merchant_id: merchant.id,
      account_id: account.id,
      order_id,
      token,
      customer_phone: customer_phone || null,
      customer_email: customer_email || null,
      customer_name: customer_name || null,
      base_amount: amount,
      decimal_offset: decimalOffset,
      total_amount: totalAmount,
      currency: 'PKR',
      status: 'PENDING',
      expires_at: expiresAt,
      metadata: metadata || {},
    });

    txId = (createdTx as any)?.id || token;

    // Reserve decimal offset
    await db.insert('decimal_reservations', {
      merchant_id: merchant.id,
      account_id: account.id,
      base_amount: amount,
      decimal_offset: decimalOffset,
      total_amount: totalAmount,
      transaction_id: txId,
      expires_at: expiresAt,
      is_active: true,
    });
  }

  const baseUrl = c.env.PUBLIC_CHECKOUT_URL || 'https://paisabridge.vercel.app/pay';
  const checkoutUrl = `${baseUrl.replace(/\/+$/, '')}/${token}`;

  const instructionsEn =
    account.instructions_en ||
    `Please transfer exactly Rs. ${totalAmount.toFixed(2)} to ${account.method.toUpperCase()} ` +
      `Account ${account.account_number} (${account.account_title}). Note: Decimals are strictly required for auto-verification.`;

  const instructionsUr =
    account.instructions_ur ||
    `Barah-e-karam aashariyah samet mukammal Rs. ${totalAmount.toFixed(2)} ` +
      `${account.method.toUpperCase()} number ${account.account_number} (${account.account_title}) par bhejein.`;

  return c.json(
    {
      success: true,
      payment: {
        id: txId,
        order_id,
        token,
        base_amount: amount,
        decimal_offset: decimalOffset,
        total_amount: totalAmount,
        currency: 'PKR',
        status: 'PENDING',
        expires_at: expiresAt,
        checkout_url: checkoutUrl,
      },
      instructions: {
        method: account.method,
        account_title: account.account_title,
        account_number: account.account_number,
        bank_name: account.bank_name || null,
        iban: account.iban || null,
        instructions_en: instructionsEn,
        instructions_ur: instructionsUr,
      },
    },
    201
  );
});

/**
 * GET /v1/payments/:id
 * Retrieves payment status and details
 */
payments.get('/:id', async (c) => {
  const merchant = c.get('merchant')!;
  const idOrToken = c.req.param('id');
  const db = getDb(c.env);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrToken);

  const filters: Record<string, unknown> = {
    merchant_id: merchant.id,
  };

  if (isUuid) {
    filters.id = idOrToken;
  } else if (idOrToken.startsWith('tok_')) {
    filters.token = idOrToken;
  } else {
    filters.order_id = idOrToken;
  }

  const tx = await db.selectOne<Transaction>('transactions', { filters });

  if (!tx) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  return c.json({
    success: true,
    payment: {
      id: tx.id,
      order_id: tx.order_id,
      base_amount: Number(tx.base_amount),
      decimal_offset: Number(tx.decimal_offset),
      total_amount: Number(tx.total_amount),
      currency: tx.currency,
      status: tx.status,
      sms_ref_code: tx.sms_ref_code || null,
      paid_at: tx.paid_at || null,
      expires_at: tx.expires_at,
      created_at: tx.created_at,
    },
  });
});

export default payments;
