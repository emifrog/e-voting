-- Migration 007: Webhooks Configuration
-- Date: 2025-11-09
-- Description: Add webhook configurations table for Slack/Teams notifications

CREATE TABLE IF NOT EXISTS webhook_configurations (
  id TEXT PRIMARY KEY,
  election_id TEXT REFERENCES elections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('slack', 'teams')),
  webhook_url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array: ["election_started", "election_closed", "quorum_reached", "vote_cast"]
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_webhook_election ON webhook_configurations(election_id);
CREATE INDEX IF NOT EXISTS idx_webhook_active ON webhook_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_platform ON webhook_configurations(platform);

-- Trigger to update updated_at
CREATE TRIGGER IF NOT EXISTS update_webhook_updated_at
AFTER UPDATE ON webhook_configurations
FOR EACH ROW
BEGIN
  UPDATE webhook_configurations
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
