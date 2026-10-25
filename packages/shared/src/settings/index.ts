import { DatabaseAdapter } from '../db/adapter';
import { encryptAesGcm, decryptAesGcm } from '../crypto';
import { PaymentMethodType } from '../types';

export type SettingsGroup =
  | 'general'
  | 'plans'
  | 'platform_accounts'
  | 'payment_engine'
  | 'parser_rules'
  | 'security'
  | 'limits_performance'
  | 'email_notifications'
  | 'webhooks'
  | 'legal'
  | 'feature_flags'
  | 'custom';

export interface SettingRecord {
  key: string;
  value_encrypted: string;
  group: SettingsGroup;
  is_secret: boolean;
  version: number;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// Typed Models for each of the 12 Groups
// ----------------------------------------------------------------------------

export interface GeneralSettings {
  site_name: string;
  site_tagline: string;
  logo_url: string;
  support_email: string;
  support_whatsapp: string;
  default_language: 'en' | 'ur';
  maintenance_mode: boolean;
  signup_open: boolean;
}

export interface PlanDefinition {
  id: string;
  name: string;
  activation_fee: number;
  monthly_fee: number;
  monthly_transaction_limit: number;
  per_transaction_fee_percent: number;
  per_transaction_fee_fixed: number;
  max_pending_orders: number;
  features: string[];
  active: boolean;
}

export interface PlatformPaymentAccount {
  id: string;
  title: string;
  number: string;
  type: PaymentMethodType;
  bank_name?: string;
  iban?: string;
  instructions: string;
  qr_image_url?: string;
  active: boolean;
}

export interface PaymentEngineSettings {
  expiry_minutes: number; // default 6
  decimal_range_min: number; // default 0.01
  decimal_range_max: number; // default 0.99
  base_amount_shift_enabled: boolean;
  max_shift_rupees: number;
  late_payment_grace_window_seconds: number;
  max_pending_per_account: number;
  duplicate_txnid_protection: boolean;
}

export interface DynamicParserRule {
  provider: string;
  sender_package: string;
  regex_amount: string;
  regex_tid: string;
  regex_sender: string;
  sample_text: string;
  active: boolean;
}

export interface SecuritySettings {
  hmac_timestamp_tolerance_seconds: number;
  heartbeat_timeout_seconds: number;
  rate_limit_ip_per_minute: number;
  rate_limit_api_key_per_minute: number;
  https_only_webhooks: boolean;
  session_length_hours: number;
  owner_2fa_enabled: boolean;
}

export interface LimitsPerformanceSettings {
  low_usage_mode: boolean;
  checkout_poll_interval_initial_sec: number;
  checkout_poll_interval_mid_sec: number;
  checkout_poll_interval_late_sec: number;
  bridge_heartbeat_interval_sec: number;
  bridge_last_seen_write_threshold_sec: number;
  raw_notification_retention_days: number;
  cron_webhook_batch_size: number;
  usage_warning_threshold_worker: number;
  usage_warning_threshold_proxy: number;
  usage_warning_threshold_webhooks: number;
}

export interface EmailNotificationsSettings {
  provider: 'resend' | 'smtp';
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  from_email: string;
  telegram_bot_enabled: boolean;
  telegram_chat_id?: string;
  templates: {
    welcome: string;
    payment_received: string;
    flagged_payment: string;
    plan_expiring: string;
    bridge_offline: string;
    [customKey: string]: string;
  };
}

export interface WebhooksSettings {
  signature_header_name: string;
  event_header_name: string;
  retry_max_attempts: number;
  backoff_schedule_minutes: number[];
}

export interface LegalPagesSettings {
  terms_markdown: string;
  privacy_markdown: string;
  refund_markdown: string;
}

export interface FeatureFlagsSettings {
  enable_raast_instant: boolean;
  enable_qr_scanner_checkout: boolean;
  enable_roman_urdu_default: boolean;
  enable_public_docs: boolean;
  enable_sandbox_simulator: boolean;
}

export interface ParserTestResult {
  matched: boolean;
  extracted_amount?: number;
  extracted_tid?: string;
  extracted_sender?: string;
  error?: string;
}

// ----------------------------------------------------------------------------
// Secret Masking & Helpers
// ----------------------------------------------------------------------------

/**
 * Masks secret values for safe display in Owner Panel UI (e.g. sk_live_••••••••3f1a)
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Tests dynamic parser regexes against an arbitrary SMS text
 */
export function testParserRule(rule: DynamicParserRule, smsText: string): ParserTestResult {
  try {
    let amount: number | undefined;
    let tid: string | undefined;
    let sender: string | undefined;

    if (rule.regex_amount) {
      const match = smsText.match(new RegExp(rule.regex_amount, 'i'));
      if (match && match[1]) {
        amount = parseFloat(match[1].replace(/,/g, '').trim());
      }
    }

    if (rule.regex_tid) {
      const match = smsText.match(new RegExp(rule.regex_tid, 'i'));
      if (match && match[1]) {
        tid = match[1].trim();
      }
    }

    if (rule.regex_sender) {
      const match = smsText.match(new RegExp(rule.regex_sender, 'i'));
      if (match && match[1]) {
        sender = match[1].trim();
      }
    }

    return {
      matched: amount !== undefined,
      extracted_amount: amount,
      extracted_tid: tid,
      extracted_sender: sender,
    };
  } catch (err: any) {
    return {
      matched: false,
      error: `Invalid regex pattern: ${err.message}`,
    };
  }
}

// ----------------------------------------------------------------------------
// Fast Cache-Aware Settings Service
// ----------------------------------------------------------------------------

export interface SettingsCacheStore {
  get: <T>(key: string) => Promise<T | null> | T | null;
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void> | void;
}

export class DynamicSettingsService {
  constructor(
    private db: DatabaseAdapter,
    private encryptionSecret: string,
    private cache?: SettingsCacheStore
  ) {}

  /**
   * Retrieves current global settings version number
   */
  async getGlobalVersion(): Promise<number> {
    const cachedVer = this.cache ? await this.cache.get<number>('settings:global_version') : null;
    if (cachedVer !== null) return cachedVer;

    try {
      const row = await this.db.selectOne<{ version: number }>('settings_version', {
        columns: ['version'],
        filters: { id: 1 },
      });
      const ver = row?.version ?? 1;
      if (this.cache) {
        await this.cache.set('settings:global_version', ver, 30);
      }
      return ver;
    } catch {
      return 1;
    }
  }

  /**
   * Reads a setting by key, decrypting if is_secret is true
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = `setting:${key}`;
    if (this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) return cached;
    }

    const row = await this.db.selectOne<SettingRecord>('settings', {
      filters: { key },
    });

    if (!row) return null;

    let parsedVal: T;
    try {
      let rawVal = row.value_encrypted;
      if (row.is_secret && rawVal) {
        rawVal = await decryptAesGcm(rawVal, this.encryptionSecret);
      }
      parsedVal = typeof rawVal === 'string' && (rawVal.startsWith('{') || rawVal.startsWith('['))
        ? JSON.parse(rawVal)
        : (rawVal as unknown as T);
    } catch (err) {
      console.error(`Failed to decrypt or parse setting key "${key}":`, err);
      return null;
    }

    if (this.cache) {
      await this.cache.set(cacheKey, parsedVal, 60);
    }

    return parsedVal;
  }

  /**
   * Reads all settings belonging to a group
   */
  async getGroup(group: SettingsGroup): Promise<Record<string, unknown>> {
    const rows = await this.db.select<SettingRecord>('settings', {
      filters: { group },
    });

    const result: Record<string, unknown> = {};

    for (const row of rows) {
      try {
        let rawVal = row.value_encrypted;
        if (row.is_secret && rawVal) {
          rawVal = await decryptAesGcm(rawVal, this.encryptionSecret);
        }
        result[row.key] = typeof rawVal === 'string' && (rawVal.startsWith('{') || rawVal.startsWith('['))
          ? JSON.parse(rawVal)
          : rawVal;
      } catch {
        result[row.key] = null;
      }
    }

    return result;
  }

  /**
   * Saves or updates a setting, encrypting automatically if isSecret is true
   */
  async save(
    key: string,
    group: SettingsGroup,
    value: unknown,
    isSecret = false
  ): Promise<void> {
    let valueToStore: string;

    if (typeof value === 'object' && value !== null) {
      valueToStore = JSON.stringify(value);
    } else {
      valueToStore = String(value ?? '');
    }

    if (isSecret && valueToStore) {
      valueToStore = await encryptAesGcm(valueToStore, this.encryptionSecret);
    }

    // Upsert into settings table
    const existing = await this.db.selectOne<SettingRecord>('settings', {
      columns: ['version'],
      filters: { key },
    });

    if (existing) {
      await this.db.update(
        'settings',
        { key },
        {
          value_encrypted: valueToStore,
          group,
          is_secret: isSecret,
          version: (existing.version || 1) + 1,
          updated_at: new Date().toISOString(),
        }
      );
    } else {
      await this.db.insert('settings', {
        key,
        value_encrypted: valueToStore,
        group,
        is_secret: isSecret,
        version: 1,
        updated_at: new Date().toISOString(),
      });
    }

    // Bump global version in database
    try {
      await this.db.update('settings_version', { id: 1 }, { updated_at: new Date().toISOString() });
    } catch {
      // Ignore if trigger already bumped
    }

    if (this.cache) {
      await this.cache.set(`setting:${key}`, value, 60);
      await this.cache.set('settings:global_version', Date.now(), 30);
    }
  }
}
