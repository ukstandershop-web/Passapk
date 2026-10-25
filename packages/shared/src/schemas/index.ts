import { z } from 'zod';

export const PaymentMethodSchema = z.enum([
  'jazzcash',
  'easypaisa',
  'bank_transfer',
  'nayapay',
  'sadapay',
  'raast',
]);

export const CreatePaymentSchema = z.object({
  order_id: z.string().min(1, 'order_id is required').max(128),
  amount: z.number().positive('amount must be greater than zero').max(5000000, 'amount exceeds single limit'),
  method: PaymentMethodSchema.optional(),
  customer_phone: z.string().regex(/^(\+92|03)[0-9]{9}$/, 'Invalid Pakistan phone format').optional(),
  customer_email: z.string().email('Invalid email').optional(),
  customer_name: z.string().max(128).optional(),
  redirect_url: z.string().url('Invalid redirect_url').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const BridgeNotifySchema = z.object({
  package_name: z.string().min(1).max(255),
  title: z.string().max(500).optional(),
  content: z.string().min(1, 'content is required').max(2000),
  post_time: z.number().int().positive(),
});

export const BridgeHeartbeatSchema = z.object({
  battery_level: z.number().int().min(0).max(100),
  is_charging: z.boolean().default(false),
  app_version: z.string().max(32).optional(),
});

export const BridgeRegisterDeviceSchema = z.object({
  device_id: z.string().min(8).max(128),
  device_name: z.string().min(1).max(128),
  device_model: z.string().max(128).optional(),
  app_version: z.string().max(32).optional(),
  fcm_token: z.string().optional(),
});

export const WebhookEventSchema = z.object({
  event: z.enum(['payment.created', 'payment.paid', 'payment.expired', 'payment.failed']),
  transaction_id: z.string().uuid(),
  order_id: z.string(),
  base_amount: z.number(),
  total_amount: z.number(),
  decimal_offset: z.number(),
  currency: z.literal('PKR'),
  sms_ref_code: z.string().nullable().optional(),
  sender_phone: z.string().nullable().optional(),
  paid_at: z.string().optional(),
});

export const SystemSettingsUpdateSchema = z.object({
  allowed_packages: z.array(z.string()).optional(),
  heartbeat_interval_seconds: z.number().int().min(30).max(600).optional(),
  db_write_throttle_seconds: z.number().int().min(30).max(600).optional(),
  low_usage_mode: z.boolean().optional(),
  default_order_timeout_minutes: z.number().int().min(5).max(60).optional(),
  decimal_range_min: z.number().min(0.01).max(0.5).optional(),
  decimal_range_max: z.number().min(0.51).max(0.99).optional(),
});
