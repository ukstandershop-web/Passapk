-- ============================================================================
-- PaisaBridge PK — Complete Database Schema (All 25 Required Tables)
-- Architecture: Hybrid Vercel (UI/Auth) + Cloudflare Worker (High-frequency API)
-- ============================================================================

-- Clean drop for idempotency if needed
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS webhook_endpoints CASCADE;
DROP TABLE IF EXISTS ticket_messages CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS parser_rules CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS raw_notifications CASCADE;
DROP TABLE IF EXISTS decimal_reservations CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bridge_devices CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS payment_accounts CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS settings_version CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS blocklist CASCADE;
DROP TABLE IF EXISTS nonces CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;

-- ----------------------------------------------------------------------------
-- 1. SETTINGS & SETTINGS VERSION
-- ----------------------------------------------------------------------------
CREATE TABLE settings (
    key VARCHAR(64) PRIMARY KEY,
    value_encrypted TEXT NOT NULL,
    "group" VARCHAR(32) NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_group ON settings("group");

CREATE TABLE settings_version (
    id INT PRIMARY KEY DEFAULT 1,
    version INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings_version (id, version, updated_at) VALUES (1, 1, NOW());

-- ----------------------------------------------------------------------------
-- 2. USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'merchant' CHECK (role IN ('owner', 'merchant', 'merchant_staff')),
    merchant_id UUID,
    name VARCHAR(128) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    token_version INT DEFAULT 1,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 3. SESSIONS
-- ----------------------------------------------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);

-- ----------------------------------------------------------------------------
-- 4. PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    activation_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monthly_transaction_limit INT NOT NULL DEFAULT 1000,
    per_transaction_fee_percent NUMERIC(5,2) DEFAULT 0.00,
    per_transaction_fee_fixed NUMERIC(6,2) DEFAULT 0.00,
    max_pending_orders INT DEFAULT 50,
    features JSONB DEFAULT '[]'::JSONB,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. MERCHANTS
-- ----------------------------------------------------------------------------
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(16) NOT NULL,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    webhook_url TEXT,
    webhook_secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'pending_approval')),
    tier VARCHAR(32) DEFAULT 'starter',
    plan_id VARCHAR(64) REFERENCES plans(id) DEFAULT 'starter',
    subscription_status VARCHAR(32) DEFAULT 'active' CHECK (subscription_status IN ('pending_activation', 'active', 'past_due', 'suspended')),
    subscription_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    allowed_ips TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_api_key_hash ON merchants(api_key_hash);
CREATE INDEX idx_merchants_email ON merchants(email);
CREATE INDEX idx_merchants_status ON merchants(status);

-- Add foreign key from users to merchants now that merchants exists
ALTER TABLE users ADD CONSTRAINT fk_users_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 6. SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES plans(id),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_merchant ON subscriptions(merchant_id, status);

-- ----------------------------------------------------------------------------
-- 7. FEE PAYMENTS (Activation & Renewal receipts)
-- ----------------------------------------------------------------------------
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES plans(id),
    type VARCHAR(32) DEFAULT 'activation' CHECK (type IN ('activation', 'renewal')),
    amount_paid NUMERIC(12,2) NOT NULL,
    sender_account VARCHAR(64) NOT NULL,
    payment_method VARCHAR(64) NOT NULL,
    proof_data_url TEXT,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_payments_merchant ON fee_payments(merchant_id, status);

-- ----------------------------------------------------------------------------
-- 8. PAYMENT ACCOUNTS
-- ----------------------------------------------------------------------------
CREATE TABLE payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    method VARCHAR(32) NOT NULL,
    account_title VARCHAR(128) NOT NULL,
    account_number VARCHAR(64) NOT NULL,
    iban VARCHAR(34),
    bank_name VARCHAR(64),
    daily_limit NUMERIC(14,2) DEFAULT 500000.00,
    current_daily_volume NUMERIC(14,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 1,
    qr_code_url TEXT,
    instructions_en TEXT,
    instructions_ur TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_accounts_merchant ON payment_accounts(merchant_id, is_active);

-- ----------------------------------------------------------------------------
-- 9. BRIDGE DEVICES
-- ----------------------------------------------------------------------------
CREATE TABLE bridge_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    device_id VARCHAR(128) NOT NULL UNIQUE,
    device_name VARCHAR(128) NOT NULL,
    device_model VARCHAR(128),
    api_key_prefix VARCHAR(16) NOT NULL,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    fcm_token TEXT,
    battery_level INT DEFAULT 100,
    is_charging BOOLEAN DEFAULT FALSE,
    app_version VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bridge_devices_hash ON bridge_devices(api_key_hash);
CREATE INDEX idx_bridge_devices_merchant ON bridge_devices(merchant_id, is_active);

-- ----------------------------------------------------------------------------
-- 10. API KEYS (Merchant API credentials)
-- ----------------------------------------------------------------------------
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    public_key VARCHAR(64) NOT NULL UNIQUE,
    secret_hash VARCHAR(64) NOT NULL,
    secret_prefix VARCHAR(16) NOT NULL,
    is_live BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    ip_whitelist TEXT[],
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_hash ON api_keys(secret_hash);
CREATE INDEX idx_api_keys_public ON api_keys(public_key, is_active);

-- ----------------------------------------------------------------------------
-- 11. TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE RESTRICT,
    order_id VARCHAR(128) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    public_token VARCHAR(64) UNIQUE,
    customer_phone VARCHAR(32),
    customer_email VARCHAR(255),
    customer_name VARCHAR(128),
    base_amount NUMERIC(12,2) NOT NULL,
    decimal_offset NUMERIC(4,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    final_amount NUMERIC(12,2), -- Alias/Duplicate for schema requirement compatibility
    currency VARCHAR(3) DEFAULT 'PKR',
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED', 'FLAGGED', 'REFUNDED')),
    sms_ref_code VARCHAR(64),
    sender_phone VARCHAR(32),
    sender_name VARCHAR(128),
    bridge_device_id UUID REFERENCES bridge_devices(id),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REQUIRED INDEX: transactions(account_id, status, final_amount) and public_token
CREATE INDEX idx_transactions_account_status_amount ON transactions(account_id, status, total_amount);
CREATE INDEX idx_transactions_public_token ON transactions(token);
CREATE INDEX idx_transactions_merchant_order ON transactions(merchant_id, order_id);
CREATE INDEX idx_transactions_expiry ON transactions(status, expires_at);

-- UNIQUE PARTIAL INDEX for active pending amounts to prevent collision
CREATE UNIQUE INDEX idx_unique_active_pending_amount
ON transactions(account_id, total_amount)
WHERE status = 'PENDING';

-- ----------------------------------------------------------------------------
-- 12. NOTIFICATIONS (Raw & Parsed SMS/Push Notifications from Bridge)
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bridge_device_id UUID REFERENCES bridge_devices(id) ON DELETE SET NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    provider_txn_id VARCHAR(64),
    sender VARCHAR(64),
    raw_text TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'flagged', 'late')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REQUIRED INDEX: notifications(provider_txn_id)
CREATE INDEX idx_notifications_provider_txn_id ON notifications(provider_txn_id);
CREATE INDEX idx_notifications_merchant ON notifications(merchant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 13. PARSER RULES
-- ----------------------------------------------------------------------------
CREATE TABLE parser_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(64) NOT NULL,
    sender_package VARCHAR(255) NOT NULL,
    regex_amount TEXT NOT NULL,
    regex_tid TEXT NOT NULL,
    regex_sender TEXT NOT NULL,
    sample_text TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 14. WEBHOOK ENDPOINTS
-- ----------------------------------------------------------------------------
CREATE TABLE webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_merchant ON webhook_endpoints(merchant_id);

-- ----------------------------------------------------------------------------
-- 15. WEBHOOK DELIVERIES
-- ----------------------------------------------------------------------------
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    event VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    target_url TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'queued' CHECK (status IN ('queued', 'success', 'failed', 'retrying')),
    attempt_count INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    next_retry_at TIMESTAMPTZ DEFAULT NOW(),
    last_status_code INT,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at);

-- ----------------------------------------------------------------------------
-- 16. LEDGER (Financial transactions and fee tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('payment_success', 'platform_fee', 'subscription_fee', 'withdrawal', 'adjustment')),
    amount NUMERIC(12,2) NOT NULL,
    fee_amount NUMERIC(12,2) DEFAULT 0.00,
    balance_after NUMERIC(14,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_merchant ON ledger(merchant_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 17. TICKETS (Support system)
-- ----------------------------------------------------------------------------
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
    priority VARCHAR(32) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_merchant ON tickets(merchant_id, status);

-- ----------------------------------------------------------------------------
-- 18. TICKET MESSAGES
-- ----------------------------------------------------------------------------
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_type VARCHAR(32) NOT NULL CHECK (sender_type IN ('merchant', 'support', 'owner')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- ----------------------------------------------------------------------------
-- 19. ANNOUNCEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role VARCHAR(32) DEFAULT 'all' CHECK (target_role IN ('all', 'merchants', 'owners')),
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 20. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 21. LOGIN LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_logs_email ON login_logs(email, created_at DESC);

-- ----------------------------------------------------------------------------
-- 22. BLOCKLIST (Merchants, IPs, Customer Numbers)
-- ----------------------------------------------------------------------------
CREATE TABLE blocklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(32) NOT NULL CHECK (type IN ('ip', 'phone', 'email', 'merchant_id')),
    value VARCHAR(255) NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocklist_type_value ON blocklist(type, value);

-- ----------------------------------------------------------------------------
-- 23. NONCES (Replay attack prevention for bridge/API)
-- ----------------------------------------------------------------------------
CREATE TABLE nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) NOT NULL,
    nonce VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_device_nonce UNIQUE (device_id, nonce)
);

CREATE INDEX idx_nonces_device ON nonces(device_id, timestamp);

-- ----------------------------------------------------------------------------
-- 24. JOBS (Background tasks queue)
-- ----------------------------------------------------------------------------
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_run ON jobs(status, run_at);

-- ----------------------------------------------------------------------------
-- 25. USAGE COUNTERS
-- ----------------------------------------------------------------------------
CREATE TABLE usage_counters (
    metric_name VARCHAR(64) NOT NULL,
    date_bucket DATE NOT NULL DEFAULT CURRENT_DATE,
    count BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (metric_name, date_bucket)
);

-- ----------------------------------------------------------------------------
-- DECIMAL RESERVATIONS (Helper table for dynamic offset engine)
-- ----------------------------------------------------------------------------
CREATE TABLE decimal_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
    base_amount NUMERIC(12,2) NOT NULL,
    decimal_offset NUMERIC(4,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_active_reservation_amount
ON decimal_reservations(account_id, total_amount)
WHERE is_active = TRUE;

-- ----------------------------------------------------------------------------
-- SEED DATA
-- ----------------------------------------------------------------------------

-- Seed Plans
INSERT INTO plans (id, name, activation_fee, monthly_fee, monthly_transaction_limit, per_transaction_fee_percent, per_transaction_fee_fixed, max_pending_orders, features, active)
VALUES
('starter', 'Starter / Aaghaz', 2500, 1500, 500, 0.50, 0.00, 15, '["1 Android Bridge Phone", "JazzCash & EasyPaisa", "Instant Webhooks", "Email Support"]'::JSONB, true),
('growth', 'Growth / Tijarat', 5000, 3500, 3000, 0.25, 0.00, 50, '["3 Android Bridge Phones", "All Banks + Wallets", "Instant Webhooks", "WhatsApp Alerts", "Priority Support"]'::JSONB, true),
('enterprise', 'Enterprise / Mahana Unlimited', 15000, 8500, 20000, 0.00, 2.00, 200, '["Unlimited Bridge Phones", "Custom Bank Integration", "Multi-tenant Staff Access", "Dedicated Account Manager"]'::JSONB, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Settings
INSERT INTO settings (key, value_encrypted, "group", is_secret, version)
VALUES
(
    'general_config',
    '{"site_name": "PaisaBridge PK", "site_tagline": "Pakistan Seamless SMS & Push Payment Gateway", "logo_url": "https://paisabridge.pk/logo.png", "support_email": "support@paisabridge.pk", "support_whatsapp": "+923001234567", "default_language": "en", "maintenance_mode": false, "signup_open": true}'::TEXT,
    'general',
    FALSE,
    1
),
(
    'payment_engine',
    '{"expiry_minutes": 5, "decimal_range_min": 0.01, "decimal_range_max": 0.99, "base_amount_shift_enabled": true, "max_shift_rupees": 5, "late_payment_grace_window_seconds": 180, "max_pending_per_account": 80, "duplicate_txnid_protection": true}'::TEXT,
    'payment_engine',
    FALSE,
    1
)
ON CONFLICT (key) DO NOTHING;

-- Seed Parser Rules
INSERT INTO parser_rules (provider, sender_package, regex_amount, regex_tid, regex_sender, sample_text, active)
VALUES
(
    'JazzCash',
    'com.techlogix.mobilinkcustomer',
    '(?:Received|received)\\s+(?:Rs\\.?|PKR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)',
    '(?:TID|Trx\\s*ID)[:\\s]+([0-9]{8,14})',
    'from\\s+([0-9]{11})',
    'Received Rs. 1500.25 from 03001234567. Your new JazzCash balance is Rs. 5000. TID: 0192837465.',
    true
),
(
    'EasyPaisa',
    'com.telenor.pakistan.easypaisa',
    '(?:received|credited)\\s+(?:Rs\\.?|PKR)\\s*([0-9,]+(?:\\.[0-9]{1,2})?)',
    '(?:TRX\\s*ID|Trx\\s*ID)[:\\s]+([0-9A-Za-z]+)',
    'from\\s+([A-Za-z\\s]+?,?\\s*[0-9]{11})',
    'You have received Rs. 1500.25 from USMAN KHAN, 03451234567. Your new easypaisa balance is Rs. 12000. TRX ID: 9876543210.',
    true
)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- ATOMIC AMOUNT RESERVATION FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reserve_decimal_offset(
    p_merchant_id UUID,
    p_account_id UUID,
    p_order_id TEXT,
    p_base_amount NUMERIC,
    p_token TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_timeout_minutes INT DEFAULT 5,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_chosen_offset NUMERIC(4,2) := NULL;
    v_total_amount NUMERIC(12,2);
    v_expires_at TIMESTAMPTZ;
    v_tx_id UUID;
    v_reservation_id UUID;
    v_offset_int INT;
    v_cand_offset NUMERIC(4,2);
    v_cand_total NUMERIC(12,2);
    v_occupied BOOLEAN;
BEGIN
    v_expires_at := NOW() + (p_timeout_minutes || ' minutes')::INTERVAL;

    -- Iterate randomly through offsets 0.01 to 0.99
    FOR v_offset_int IN
        SELECT (1 + floor(random() * 99))::INT
        FROM generate_series(1, 99)
        GROUP BY 1
        ORDER BY random()
    LOOP
        v_cand_offset := (v_offset_int::NUMERIC / 100.0);
        v_cand_total := round(p_base_amount + v_cand_offset, 2);

        SELECT EXISTS (
            SELECT 1 FROM decimal_reservations
            WHERE account_id = p_account_id
              AND total_amount = v_cand_total
              AND is_active = TRUE
              AND expires_at >= NOW()
        ) INTO v_occupied;

        IF NOT v_occupied THEN
            v_chosen_offset := v_cand_offset;
            v_total_amount := v_cand_total;
            EXIT;
        END IF;
    END LOOP;

    IF v_chosen_offset IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_DECIMAL_SLOTS');
    END IF;

    INSERT INTO transactions (
        merchant_id,
        account_id,
        order_id,
        token,
        public_token,
        customer_phone,
        customer_email,
        customer_name,
        base_amount,
        decimal_offset,
        total_amount,
        final_amount,
        currency,
        status,
        expires_at,
        metadata
    )
    VALUES (
        p_merchant_id,
        p_account_id,
        p_order_id,
        p_token,
        p_token,
        p_customer_phone,
        p_customer_email,
        p_customer_name,
        p_base_amount,
        v_chosen_offset,
        v_total_amount,
        v_total_amount,
        'PKR',
        'PENDING',
        v_expires_at,
        p_metadata
    )
    RETURNING id INTO v_tx_id;

    INSERT INTO decimal_reservations (
        merchant_id,
        account_id,
        base_amount,
        decimal_offset,
        total_amount,
        transaction_id,
        expires_at,
        is_active
    )
    VALUES (
        p_merchant_id,
        p_account_id,
        p_base_amount,
        v_chosen_offset,
        v_total_amount,
        v_tx_id,
        v_expires_at,
        TRUE
    )
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'decimal_offset', v_chosen_offset,
        'total_amount', v_total_amount,
        'token', p_token,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
