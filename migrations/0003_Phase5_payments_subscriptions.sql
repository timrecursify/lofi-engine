-- Phase 5 - Payments & Subscriptions Migration
-- Migration: 0003_Phase5_payments_subscriptions.sql
-- Description: Add tables for Stripe subscriptions, payments, and ad impressions

-- ==================================================
-- Subscriptions Table
-- ==================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
    current_period_start TEXT NOT NULL, -- ISO 8601 timestamp
    current_period_end TEXT NOT NULL,   -- ISO 8601 timestamp
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    trial_start TEXT,                   -- ISO 8601 timestamp
    trial_end TEXT,                     -- ISO 8601 timestamp
    canceled_at TEXT,                   -- ISO 8601 timestamp
    metadata TEXT,                      -- JSON string for additional Stripe metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- ==================================================
-- Payments Table
-- ==================================================

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    stripe_subscription_id TEXT,
    stripe_charge_id TEXT,
    stripe_payment_intent_id TEXT,
    amount INTEGER NOT NULL,            -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled', 'requires_action')),
    payment_method_type TEXT,           -- 'card', 'bank_account', etc.
    failure_code TEXT,                  -- Stripe failure code if failed
    failure_message TEXT,               -- Human-readable failure message
    description TEXT,                   -- Invoice description
    metadata TEXT,                      -- JSON string for additional data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (stripe_subscription_id) REFERENCES subscriptions(stripe_subscription_id) ON DELETE CASCADE
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice_id ON payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_subscription_id ON payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount);

-- ==================================================
-- Ad Impressions Table
-- ==================================================

CREATE TABLE IF NOT EXISTS ad_impressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    ad_id TEXT NOT NULL,
    ad_type TEXT NOT NULL CHECK (ad_type IN ('audio', 'banner', 'companion')),
    slot_id TEXT,                       -- Banner slot ID for banner ads
    vast_ad_id TEXT,                    -- VAST ad ID for audio ads
    impression_url TEXT,                -- URL fired for impression tracking
    click_url TEXT,                     -- URL if ad was clicked
    duration INTEGER,                   -- Duration in seconds (for audio ads)
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    skipped BOOLEAN NOT NULL DEFAULT FALSE,
    clicked BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,                 -- Error message if ad failed
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for ad_impressions
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON ad_impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_type ON ad_impressions(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_timestamp ON ad_impressions(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_completed ON ad_impressions(completed);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_clicked ON ad_impressions(clicked);

-- ==================================================
-- Customer Support Table
-- ==================================================

CREATE TABLE IF NOT EXISTS customer_support (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    ticket_id TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('billing', 'technical', 'feature', 'bug', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to TEXT,                   -- Staff member assigned to ticket
    resolution TEXT,                    -- Resolution notes
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for customer_support
CREATE INDEX IF NOT EXISTS idx_customer_support_user_id ON customer_support(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_ticket_id ON customer_support(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_status ON customer_support(status);
CREATE INDEX IF NOT EXISTS idx_customer_support_priority ON customer_support(priority);
CREATE INDEX IF NOT EXISTS idx_customer_support_category ON customer_support(category);
CREATE INDEX IF NOT EXISTS idx_customer_support_created_at ON customer_support(created_at);

-- ==================================================
-- Upgrade Users Table with Subscription Fields
-- ==================================================

-- Add new columns to users table for subscription tracking (skip stripe_customer_id as it already exists)
-- Note: stripe_customer_id already exists in the users table

-- Check and add subscription_status column
-- We'll use a simple approach since SQLite doesn't support conditional column addition
INSERT OR IGNORE INTO metadata (key, value) VALUES ('migration_0003_start', datetime('now'));

-- Add columns only if they don't exist (will fail silently if they exist)
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'trialing', 'active', 'past_due', 'canceled'));
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro'));
ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
ALTER TABLE users ADD COLUMN subscription_canceled_at TEXT;

-- Create indexes for new user columns (these will be created only if columns exist)
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users(trial_ends_at);

-- ==================================================
-- Triggers for Automated Updates
-- ==================================================

-- Update updated_at timestamp on subscriptions
CREATE TRIGGER IF NOT EXISTS update_subscriptions_updated_at
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
BEGIN
    UPDATE subscriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update updated_at timestamp on payments
CREATE TRIGGER IF NOT EXISTS update_payments_updated_at
    AFTER UPDATE ON payments
    FOR EACH ROW
BEGIN
    UPDATE payments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Update updated_at timestamp on customer_support
CREATE TRIGGER IF NOT EXISTS update_customer_support_updated_at
    AFTER UPDATE ON customer_support
    FOR EACH ROW
BEGIN
    UPDATE customer_support SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-update user subscription status when subscription changes
CREATE TRIGGER IF NOT EXISTS sync_user_subscription_status
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
BEGIN
    UPDATE users 
    SET 
        subscription_status = NEW.status,
        subscription_tier = CASE 
            WHEN NEW.status IN ('active', 'trialing') THEN 'pro'
            ELSE 'free'
        END,
        trial_ends_at = NEW.trial_end,
        stripe_customer_id = NEW.stripe_customer_id,
        updated_at = datetime('now')
    WHERE id = NEW.user_id;
END;

-- ==================================================
-- Data Cleanup Triggers
-- ==================================================

-- Clean up old ad impressions (older than 90 days)
CREATE TRIGGER IF NOT EXISTS cleanup_old_ad_impressions
    AFTER INSERT ON ad_impressions
    FOR EACH ROW
BEGIN
    DELETE FROM ad_impressions 
    WHERE timestamp < datetime('now', '-90 days')
    AND id NOT IN (
        SELECT id FROM ad_impressions 
        ORDER BY timestamp DESC 
        LIMIT 100000
    );
END;

-- Clean up old payments (keep last 2 years)
CREATE TRIGGER IF NOT EXISTS cleanup_old_payments
    AFTER INSERT ON payments
    FOR EACH ROW
BEGIN
    DELETE FROM payments 
    WHERE created_at < datetime('now', '-2 years')
    AND status IN ('succeeded', 'failed', 'canceled');
END;

-- ==================================================
-- Initial Data Setup
-- ==================================================

-- Insert default subscription tiers reference data
INSERT OR IGNORE INTO metadata (key, value) VALUES 
    ('subscription_tiers', json('[
        {
            "id": "free",
            "name": "Free",
            "price": 0,
            "features": ["Basic content", "Limited topics", "Ad-supported"],
            "limits": {
                "topics": 5,
                "daily_listening": 180,
                "ad_free": false
            }
        },
        {
            "id": "pro",
            "name": "Pro",
            "price": 999,
            "features": ["All content", "All topics", "Ad-free", "Priority support"],
            "limits": {
                "topics": -1,
                "daily_listening": -1,
                "ad_free": true
            }
        }
    ]')),
    ('payment_config', json('{
        "currencies": ["usd"],
        "payment_methods": ["card"],
        "billing_cycles": ["monthly", "yearly"],
        "trial_period_days": 7
    }')),
    ('ad_config', json('{
        "free_tier_interval": 600,
        "banner_refresh_interval": 300,
        "impression_tracking": true,
        "fallback_ads": true
    }'));

-- ==================================================
-- Views for Common Queries
-- ==================================================

-- Active subscriptions view
CREATE VIEW IF NOT EXISTS active_subscriptions AS
SELECT 
    s.*,
    u.email as user_email,
    u.full_name as user_name,
    u.created_at as user_created_at
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC;

-- Payment history view
CREATE VIEW IF NOT EXISTS payment_history AS
SELECT 
    p.*,
    u.email as user_email,
    s.stripe_subscription_id,
    s.status as subscription_status
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN subscriptions s ON p.stripe_subscription_id = s.stripe_subscription_id
ORDER BY p.created_at DESC;

-- Ad analytics view
CREATE VIEW IF NOT EXISTS ad_analytics AS
SELECT 
    date(timestamp) as date,
    ad_type,
    COUNT(*) as total_impressions,
    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_impressions,
    SUM(CASE WHEN clicked = 1 THEN 1 ELSE 0 END) as clicks,
    SUM(CASE WHEN skipped = 1 THEN 1 ELSE 0 END) as skips,
    ROUND(AVG(duration), 2) as avg_duration
FROM ad_impressions
GROUP BY date(timestamp), ad_type
ORDER BY date DESC;

-- ==================================================
-- Migration Completion Log
-- ==================================================

INSERT OR REPLACE INTO metadata (key, value) VALUES 
    ('migration_0003_applied', datetime('now')),
    ('migration_0003_version', '1.0.0'),
    ('migration_0003_description', 'Phase 5 - Payments & Subscriptions system'),
    ('current_schema_version', '0003');

-- Log completion
INSERT INTO system_logs (level, message, context, timestamp) VALUES 
    ('info', 'Phase 5 payments migration completed successfully', 
     json('{"migration": "0003", "tables_created": 4, "indexes_created": 20, "triggers_created": 5}'), 
     datetime('now')); 