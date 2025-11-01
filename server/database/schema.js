export const createTables = (db) => {
  // Table des utilisateurs (administrateurs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des élections/votes
  db.exec(`
    CREATE TABLE IF NOT EXISTS elections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      voting_type TEXT NOT NULL,
      is_secret INTEGER DEFAULT 1,
      is_weighted INTEGER DEFAULT 0,
      allow_anonymity INTEGER DEFAULT 0,
      scheduled_start DATETIME,
      scheduled_end DATETIME,
      actual_start DATETIME,
      actual_end DATETIME,
      deferred_counting INTEGER DEFAULT 0,
      max_voters INTEGER DEFAULT 10000,
      settings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Table des questions/options de vote
  db.exec(`
    CREATE TABLE IF NOT EXISTS election_options (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      option_text TEXT NOT NULL,
      option_order INTEGER,
      candidate_name TEXT,
      candidate_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    )
  `);

  // Table des électeurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS voters (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      weight REAL DEFAULT 1.0,
      token TEXT UNIQUE NOT NULL,
      qr_code TEXT,
      has_voted INTEGER DEFAULT 0,
      voted_at DATETIME,
      reminder_sent INTEGER DEFAULT 0,
      last_reminder_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(election_id, email),
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    )
  `);

  // Table des bulletins (votes secrets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ballots (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      ballot_hash TEXT UNIQUE NOT NULL,
      encrypted_vote TEXT NOT NULL,
      voter_weight REAL DEFAULT 1.0,
      cast_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    )
  `);

  // Table des votes non anonymes
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_votes (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      vote_data TEXT NOT NULL,
      cast_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE
    )
  `);

  // Table des observateurs/scrutateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS observers (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      access_token TEXT UNIQUE NOT NULL,
      can_see_results INTEGER DEFAULT 1,
      can_see_turnout INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(election_id, email),
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    )
  `);

  // Table de la liste d'émargement
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_list (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
      FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE
    )
  `);

  // Table des logs d'audit
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      election_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table des tâches planifiées
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      scheduled_for DATETIME NOT NULL,
      executed INTEGER DEFAULT 0,
      executed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
    )
  `);

  // Index pour optimiser les requêtes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_voters_election ON voters(election_id);
    CREATE INDEX IF NOT EXISTS idx_voters_token ON voters(token);
    CREATE INDEX IF NOT EXISTS idx_ballots_election ON ballots(election_id);
    CREATE INDEX IF NOT EXISTS idx_public_votes_election ON public_votes(election_id);
    CREATE INDEX IF NOT EXISTS idx_observers_election ON observers(election_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_election ON attendance_list(election_id);
  `);
};
