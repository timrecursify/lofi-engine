-- Migration 0002: Phase 4 Content Pipeline
-- Add tables for content clips and pipeline jobs
-- Created: 2025-01-06

-- Content clips table - stores generated audio clips
CREATE TABLE IF NOT EXISTS content_clips (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration INTEGER NOT NULL,
    size INTEGER NOT NULL,
    topic TEXT NOT NULL,
    sources TEXT NOT NULL, -- JSON array of source names
    voice_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    storage_location TEXT NOT NULL CHECK (storage_location IN ('kv', 'r2')),
    url TEXT NOT NULL
);

-- Performance indexes for content_clips
CREATE INDEX IF NOT EXISTS idx_content_clips_topic ON content_clips (topic);
CREATE INDEX IF NOT EXISTS idx_content_clips_created_at ON content_clips (created_at);
CREATE INDEX IF NOT EXISTS idx_content_clips_topic_created ON content_clips (topic, created_at);

-- Pipeline jobs table - tracks content generation pipeline status
CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'fetching', 'generating', 'rendering', 'completed', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    error TEXT,
    clip_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key relationship
    FOREIGN KEY (clip_id) REFERENCES content_clips(id) ON DELETE SET NULL
);

-- Performance indexes for pipeline_jobs
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_topic ON pipeline_jobs (topic);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs (status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created_at ON pipeline_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_clip_id ON pipeline_jobs (clip_id);

-- Content sources table - track RSS/API source reliability
CREATE TABLE IF NOT EXISTS content_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    topic TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api')),
    last_fetch DATETIME,
    last_success DATETIME,
    failure_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(name, topic)
);

-- Performance indexes for content_sources
CREATE INDEX IF NOT EXISTS idx_content_sources_topic ON content_sources (topic);
CREATE INDEX IF NOT EXISTS idx_content_sources_active ON content_sources (is_active);
CREATE INDEX IF NOT EXISTS idx_content_sources_last_fetch ON content_sources (last_fetch);

-- Insert default content sources
INSERT OR IGNORE INTO content_sources (id, name, url, topic, source_type, is_active) VALUES
('reuters_world', 'Reuters World News', 'https://feeds.reuters.com/reuters/worldNews', 'world-news', 'rss', TRUE),
('google_news', 'Google News', 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en', 'world-news', 'rss', TRUE),
('reddit_worldnews', 'Reddit World News', 'https://www.reddit.com/r/worldnews/.rss?limit=25', 'world-news', 'rss', TRUE),
('espn_sports', 'ESPN Sports', 'https://www.espn.com/espn/rss/news', 'sports', 'rss', TRUE),
('reddit_sports', 'Reddit Sports', 'https://www.reddit.com/r/sports/.rss?limit=25', 'sports', 'rss', TRUE),
('coingecko_crypto', 'CoinGecko API', 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false', 'crypto', 'api', TRUE),
('reddit_crypto', 'Reddit Crypto', 'https://www.reddit.com/r/CryptoCurrency/.rss?limit=25', 'crypto', 'rss', TRUE),
('reddit_technology', 'Reddit Technology', 'https://www.reddit.com/r/technology/.rss?limit=25', 'technology', 'rss', TRUE);

-- Content generation stats table - for analytics
CREATE TABLE IF NOT EXISTS content_stats (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    topic TEXT NOT NULL,
    clips_generated INTEGER DEFAULT 0,
    clips_failed INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0,
    grok_api_calls INTEGER DEFAULT 0,
    elevenlabs_api_calls INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(date, topic)
);

-- Performance indexes for content_stats
CREATE INDEX IF NOT EXISTS idx_content_stats_date ON content_stats (date);
CREATE INDEX IF NOT EXISTS idx_content_stats_topic ON content_stats (topic);
CREATE INDEX IF NOT EXISTS idx_content_stats_date_topic ON content_stats (date, topic);

-- Cleanup trigger - automatically delete old content clips
CREATE TRIGGER IF NOT EXISTS cleanup_old_clips
    AFTER INSERT ON content_clips
    BEGIN
        DELETE FROM content_clips 
        WHERE created_at < datetime('now', '-7 days');
    END;

-- Update content stats trigger
CREATE TRIGGER IF NOT EXISTS update_content_stats
    AFTER INSERT ON content_clips
    BEGIN
        INSERT OR REPLACE INTO content_stats (
            id, date, topic, clips_generated, total_duration, total_size, created_at
        ) VALUES (
            NEW.topic || '_' || date('now'),
            date('now'),
            NEW.topic,
            COALESCE((SELECT clips_generated FROM content_stats WHERE date = date('now') AND topic = NEW.topic), 0) + 1,
            COALESCE((SELECT total_duration FROM content_stats WHERE date = date('now') AND topic = NEW.topic), 0) + NEW.duration,
            COALESCE((SELECT total_size FROM content_stats WHERE date = date('now') AND topic = NEW.topic), 0) + NEW.size,
            CURRENT_TIMESTAMP
        );
    END; 