-- Production D1 Database Schema for LoFi Radio
-- Version: 1.0
-- Created: Phase 2 - Authentication & Preferences Migration

-- ==================================================
-- User Management Tables
-- ==================================================

-- Core user table with Clerk integration
CREATE TABLE users (
  id TEXT PRIMARY KEY,                          -- Clerk user ID
  email TEXT UNIQUE NOT NULL,                   -- Primary email from Clerk
  clerk_id TEXT UNIQUE NOT NULL,                -- Clerk user ID (duplicate for clarity)
  full_name TEXT,                               -- Full name from Clerk
  image_url TEXT,                               -- Profile image URL
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  locale TEXT DEFAULT 'en-US',
  timezone TEXT DEFAULT 'UTC',
  email_verified BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,               -- For payments
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User preferences with versioning for sync
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Audio preferences
  volume_music REAL DEFAULT 0.7 CHECK (volume_music BETWEEN 0.0 AND 1.0),
  volume_voice REAL DEFAULT 0.8 CHECK (volume_voice BETWEEN 0.0 AND 1.0),
  volume_effects REAL DEFAULT 0.5 CHECK (volume_effects BETWEEN 0.0 AND 1.0),
  volume_ads REAL DEFAULT 0.5 CHECK (volume_ads BETWEEN 0.0 AND 1.0),
  narration_speed REAL DEFAULT 1.0 CHECK (narration_speed BETWEEN 0.8 AND 1.5),
  
  -- UI preferences
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'amoled', 'sepia')),
  scene TEXT DEFAULT 'auto' CHECK (scene IN ('auto', 'city', 'nature', 'space', 'underwater')),
  vinyl_fx BOOLEAN DEFAULT FALSE,
  
  -- Content preferences (JSON for flexibility)
  enabled_topics TEXT DEFAULT '["world-news","local-news","weather","education","health"]',  -- JSON array
  
  -- Sync metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,               -- For soft deletes
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- Content Management Tables
-- ==================================================

-- Audio clips metadata
CREATE TABLE clips (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  title TEXT,
  storage_type TEXT CHECK (storage_type IN ('kv', 'r2')),
  storage_key TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  voice_id TEXT,
  script_hash TEXT UNIQUE,                      -- For deduplication
  source_url TEXT,
  play_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,                          -- For cleanup
  is_active BOOLEAN DEFAULT TRUE
);

-- Topic statistics for optimization
CREATE TABLE topic_stats (
  topic TEXT PRIMARY KEY,
  active_listeners INTEGER DEFAULT 0,
  clips_generated_today INTEGER DEFAULT 0,
  clips_played_today INTEGER DEFAULT 0,
  last_generated_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- Analytics & Logging Tables
-- ==================================================

-- User playback activity
CREATE TABLE play_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- Allow anonymous plays
  clip_id TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('play', 'pause', 'skip', 'complete')),
  position_seconds INTEGER DEFAULT 0,
  session_id TEXT,                              -- For session tracking
  client_ip TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature usage tracking
CREATE TABLE feature_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  feature_name TEXT NOT NULL,
  feature_data TEXT,                            -- JSON for flexible data
  session_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Error logging
CREATE TABLE error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  context_data TEXT,                            -- JSON for additional context
  client_info TEXT,                             -- Browser/device info
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- Payment & Subscription Tables
-- ==================================================

-- Subscription tracking
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,                          -- Stripe subscription ID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('pro_monthly', 'pro_yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start DATETIME NOT NULL,
  current_period_end DATETIME NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment history
CREATE TABLE payments (
  id TEXT PRIMARY KEY,                          -- Stripe payment intent ID
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  stripe_payment_intent_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- System Tables
-- ==================================================

-- Schema migrations tracking
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL,
  description TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Application configuration
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- Performance Indexes
-- ==================================================

-- User table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_active ON user_preferences(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_preferences_version ON user_preferences(user_id, version DESC);
CREATE INDEX idx_user_preferences_updated ON user_preferences(updated_at DESC);

-- Clips table indexes
CREATE INDEX idx_clips_topic_expires ON clips(topic, expires_at);
CREATE INDEX idx_clips_created ON clips(created_at DESC);
CREATE INDEX idx_clips_storage ON clips(storage_type, storage_key);
CREATE INDEX idx_clips_script_hash ON clips(script_hash);
CREATE INDEX idx_clips_active ON clips(is_active) WHERE is_active = TRUE;

-- Play log indexes (for analytics)
CREATE INDEX idx_play_log_user_clip ON play_log(user_id, clip_id);
CREATE INDEX idx_play_log_timestamp ON play_log(timestamp DESC);
CREATE INDEX idx_play_log_session ON play_log(session_id);
CREATE INDEX idx_play_log_action ON play_log(action, timestamp DESC);

-- Feature usage indexes
CREATE INDEX idx_feature_usage_user ON feature_usage(user_id, feature_name);
CREATE INDEX idx_feature_usage_timestamp ON feature_usage(timestamp DESC);

-- Subscription indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_end);

-- Payment indexes
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- ==================================================
-- Triggers for Data Integrity
-- ==================================================

-- Update timestamps on user preferences changes
CREATE TRIGGER update_user_preferences_timestamp
  AFTER UPDATE ON user_preferences
  BEGIN
    UPDATE user_preferences 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

-- Update user last_seen when preferences are accessed
CREATE TRIGGER update_user_last_seen
  AFTER UPDATE ON user_preferences
  BEGIN
    UPDATE users 
    SET last_seen_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.user_id;
  END;

-- Increment play count on clip completion
CREATE TRIGGER increment_clip_play_count
  AFTER INSERT ON play_log
  WHEN NEW.action = 'complete'
  BEGIN
    UPDATE clips 
    SET play_count = play_count + 1 
    WHERE id = NEW.clip_id;
  END;

-- ==================================================
-- Initial Data
-- ==================================================

-- Insert initial migration record
INSERT INTO migrations (version, description) 
VALUES ('1.0.0', 'Initial schema with user preferences and Clerk integration');

-- Insert default app configuration
INSERT INTO app_config (key, value, description) VALUES
  ('max_clip_duration', '300', 'Maximum clip duration in seconds'),
  ('max_clips_per_topic', '50', 'Maximum clips to keep per topic'),
  ('preference_sync_interval', '1000', 'Preference sync debounce in milliseconds'),
  ('analytics_retention_days', '90', 'Days to retain analytics data'),
  ('free_plan_limits', '{"max_topics": 5, "max_queue_size": 10}', 'Free plan limitations as JSON');

-- ==================================================
-- Views for Common Queries
-- ==================================================

-- Active user preferences view
CREATE VIEW active_user_preferences AS
SELECT 
  u.id,
  u.email,
  u.plan,
  up.volume_music,
  up.volume_voice,
  up.volume_effects,
  up.volume_ads,
  up.narration_speed,
  up.theme,
  up.scene,
  up.vinyl_fx,
  up.enabled_topics,
  up.version,
  up.synced_at
FROM users u
JOIN user_preferences up ON u.id = up.user_id
WHERE up.is_active = TRUE;

-- User activity summary view
CREATE VIEW user_activity_summary AS
SELECT 
  u.id,
  u.email,
  u.plan,
  COUNT(DISTINCT pl.clip_id) as clips_played,
  COUNT(pl.id) as total_plays,
  MAX(pl.timestamp) as last_play_at,
  u.last_seen_at
FROM users u
LEFT JOIN play_log pl ON u.id = pl.user_id
GROUP BY u.id;

-- Clip performance view
CREATE VIEW clip_performance AS
SELECT 
  c.id,
  c.topic,
  c.title,
  c.duration_seconds,
  c.play_count,
  COUNT(pl.id) as session_plays,
  AVG(pl.position_seconds) as avg_listen_position,
  (AVG(pl.position_seconds) * 1.0 / c.duration_seconds) as completion_rate
FROM clips c
LEFT JOIN play_log pl ON c.id = pl.clip_id
WHERE c.is_active = TRUE
GROUP BY c.id;
