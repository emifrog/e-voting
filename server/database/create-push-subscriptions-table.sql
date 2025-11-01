-- Table pour stocker les subscriptions Web Push
-- Chaque utilisateur peut avoir plusieurs subscriptions (plusieurs devices)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys TEXT NOT NULL,  -- JSON contenant p256dh et auth
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour rechercher rapidement les subscriptions d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
ON push_subscriptions(user_id);

-- Index pour l'endpoint (utilisé pour vérifier les doublons)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
ON push_subscriptions(endpoint);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER IF NOT EXISTS update_push_subscriptions_timestamp
AFTER UPDATE ON push_subscriptions
FOR EACH ROW
BEGIN
  UPDATE push_subscriptions
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
