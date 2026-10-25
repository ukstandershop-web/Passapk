export type PaymentMethodType =
  | 'jazzcash'
  | 'easypaisa'
  | 'bank_transfer'
  | 'nayapay'
  | 'sadapay'
  | 'raast';

export type TransactionStatus =
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | 'FLAGGED'
  | 'REFUNDED';

export type WebhookStatus =
  | 'queued'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'retrying';

export type WebhookEventType =
  | 'payment.created'
  | 'payment.paid'
  | 'payment.expired'
  | 'payment.failed';

export interface Merchant {
  id: string;
  business_name: string;
  email: string;
  password_hash?: string;
  api_key_prefix: string;
  api_key_hash: string;
  webhook_url?: string | null;
  webhook_secret: string;
  is_active: boolean;
  tier: 'free' | 'standard' | 'pro' | 'enterprise';
  allowed_ips?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAccount {
  id: string;
  merchant_id: string;
  method: PaymentMethodType;
  account_title: string;
  account_number: string;
  iban?: string | null;
  bank_name?: string | null;
  daily_limit: number;
  current_daily_volume: number;
  is_active: boolean;
  priority: number;
  qr_code_url?: string | null;
  instructions_en?: string | null;
  instructions_ur?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  account_id: string;
  order_id: string;
  token: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  base_amount: number;
  decimal_offset: number;
  total_amount: number;
  currency: string;
  status: TransactionStatus;
  sms_ref_code?: string | null;
  sender_phone?: string | null;
  sender_name?: string | null;
  bridge_device_id?: string | null;
  paid_at?: string | null;
  expires_at: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DecimalReservation {
  id: string;
  merchant_id: string;
  account_id: string;
  base_amount: number;
  decimal_offset: number;
  total_amount: number;
  transaction_id: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface BridgeDevice {
  id: string;
  merchant_id: string;
  device_id: string;
  device_name: string;
  device_model?: string | null;
  api_key_prefix: string;
  api_key_hash: string;
  fcm_token?: string | null;
  battery_level: number;
  is_charging: boolean;
  app_version?: string | null;
  is_active: boolean;
  last_heartbeat_at: string;
  last_db_write_at: string;
  created_at: string;
  updated_at: string;
}

export interface RawNotification {
  id: string;
  bridge_device_id?: string | null;
  merchant_id: string;
  package_name: string;
  title?: string | null;
  content: string;
  post_time: number;
  extracted_amount?: number | null;
  extracted_tid?: string | null;
  extracted_sender?: string | null;
  matched_transaction_id?: string | null;
  is_financial: boolean;
  created_at: string;
}

export interface WebhookJob {
  id: string;
  merchant_id: string;
  transaction_id: string;
  event: string;
  payload: Record<string, unknown>;
  target_url: string;
  secret: string;
  status: WebhookStatus;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string;
  last_status_code?: number | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingsBridgeConfig {
  allowed_packages: string[];
  heartbeat_interval_seconds: number;
  db_write_throttle_seconds: number;
  low_usage_mode: boolean;
}

export interface SystemSettingsPaymentConfig {
  default_order_timeout_minutes: number;
  decimal_range_min: number;
  decimal_range_max: number;
  max_retry_retention_days: number;
  webhook_max_attempts: number;
}

export interface SystemSettingsLimits {
  warn_worker_requests: number;
  warn_proxy_requests: number;
  warn_webhook_sends: number;
}

export interface SystemSetting<T = unknown> {
  key: string;
  value: T;
  description?: string;
  version: number;
  updated_at: string;
}

// Request & Response DTOs
export interface CreatePaymentRequest {
  order_id: string;
  amount: number;
  method?: PaymentMethodType;
  customer_phone?: string;
  customer_email?: string;
  customer_name?: string;
  redirect_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment: {
    id: string;
    order_id: string;
    token: string;
    base_amount: number;
    decimal_offset: number;
    total_amount: number;
    currency: string;
    status: TransactionStatus;
    expires_at: string;
    checkout_url: string;
  };
  instructions: {
    method: PaymentMethodType;
    account_title: string;
    account_number: string;
    bank_name?: string | null;
    iban?: string | null;
    instructions_en: string;
    instructions_ur: string;
  };
}

export interface CheckoutStatusResponse {
  status: TransactionStatus;
  total_amount: number;
  currency: string;
  expires_at: string;
  is_expired: boolean;
  paid_at?: string | null;
  method: PaymentMethodType;
  account_title: string;
  account_number: string;
  bank_name?: string | null;
  next_poll_interval_seconds: number;
}

export interface BridgeNotifyRequest {
  package_name: string;
  title?: string;
  content: string;
  post_time: number;
}

export interface BridgeHeartbeatRequest {
  battery_level: number;
  is_charging: boolean;
  app_version?: string;
}

export interface ParsedNotification {
  is_financial: boolean;
  amount?: number;
  tid?: string;
  sender?: string;
  method?: PaymentMethodType;
  raw_content: string;
}

export interface MerchantApiKey {
  id: string;
  merchant_id: string;
  name: string;
  public_key: string;
  secret_hash: string;
  secret_prefix: string;
  is_live: boolean;
  is_active: boolean;
  ip_whitelist?: string[] | null;
  last_used_at?: string | null;
  created_at: string;
}

export interface MerchantBranding {
  merchant_id: string;
  logo_url?: string | null;
  brand_color: string;
  welcome_message?: string | null;
  success_url?: string | null;
  cancel_url?: string | null;
  show_timer: boolean;
  updated_at?: string;
}

export interface MerchantAlerts {
  merchant_id: string;
  email_on_payment: boolean;
  email_on_offline: boolean;
  telegram_on_payment: boolean;
  telegram_on_offline: boolean;
  telegram_chat_id?: string | null;
  updated_at?: string;
}

export interface StaffPermission {
  user_id: string;
  can_view_transactions: boolean;
  can_manage_accounts: boolean;
  can_manage_bridge: boolean;
  can_view_analytics: boolean;
  can_export_reports: boolean;
  can_manage_webhooks: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BillingProof {
  id: string;
  merchant_id: string;
  plan_id: string;
  type: 'activation' | 'renewal';
  amount_paid: number;
  sender_account: string;
  payment_method: string;
  proof_data_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}
