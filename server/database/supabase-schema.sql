-- Schema PostgreSQL pour Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs (administrateurs)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  two_factor_backup_codes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table des élections/votes
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft',
  voting_type VARCHAR(50) NOT NULL,
  is_secret BOOLEAN DEFAULT true,
  is_weighted BOOLEAN DEFAULT false,
  allow_anonymity BOOLEAN DEFAULT false,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  deferred_counting BOOLEAN DEFAULT false,
  max_voters INTEGER DEFAULT 10000,
  quorum_type VARCHAR(50) DEFAULT 'none',
  quorum_value DECIMAL(5,2) DEFAULT 0,
  quorum_reached BOOLEAN DEFAULT false,
  quorum_reached_at TIMESTAMP WITH TIME ZONE,
  meeting_platform VARCHAR(50),
  meeting_url TEXT,
  meeting_id VARCHAR(255),
  meeting_password VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur created_by et status
CREATE INDEX IF NOT EXISTS idx_elections_created_by ON elections(created_by);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);

-- Table des questions/options de vote
CREATE TABLE IF NOT EXISTS election_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER,
  candidate_name VARCHAR(255),
  candidate_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur election_id
CREATE INDEX IF NOT EXISTS idx_election_options_election ON election_options(election_id);

-- Table des électeurs
CREATE TABLE IF NOT EXISTS voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  weight DECIMAL(5,2) DEFAULT 1.0,
  token VARCHAR(255) UNIQUE NOT NULL,
  qr_code TEXT,
  has_voted BOOLEAN DEFAULT false,
  voted_at TIMESTAMP WITH TIME ZONE,
  reminder_sent BOOLEAN DEFAULT false,
  last_reminder_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(election_id, email)
);

-- Index sur election_id, token
CREATE INDEX IF NOT EXISTS idx_voters_election ON voters(election_id);
CREATE INDEX IF NOT EXISTS idx_voters_token ON voters(token);
CREATE INDEX IF NOT EXISTS idx_voters_has_voted ON voters(has_voted);

-- Table des bulletins (votes secrets)
CREATE TABLE IF NOT EXISTS ballots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  ballot_hash VARCHAR(255) UNIQUE NOT NULL,
  encrypted_vote TEXT NOT NULL,
  voter_weight DECIMAL(5,2) DEFAULT 1.0,
  cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- Index sur election_id
CREATE INDEX IF NOT EXISTS idx_ballots_election ON ballots(election_id);
CREATE INDEX IF NOT EXISTS idx_ballots_hash ON ballots(ballot_hash);

-- Table des votes non anonymes
CREATE TABLE IF NOT EXISTS public_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  vote_data JSONB NOT NULL,
  cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur election_id et voter_id
CREATE INDEX IF NOT EXISTS idx_public_votes_election ON public_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_public_votes_voter ON public_votes(voter_id);

-- Table des observateurs/scrutateurs
CREATE TABLE IF NOT EXISTS observers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  can_see_results BOOLEAN DEFAULT true,
  can_see_turnout BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(election_id, email)
);

-- Index sur election_id et access_token
CREATE INDEX IF NOT EXISTS idx_observers_election ON observers(election_id);
CREATE INDEX IF NOT EXISTS idx_observers_token ON observers(access_token);

-- Table de la liste d'émargement
CREATE TABLE IF NOT EXISTS attendance_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Index sur election_id et voter_id
CREATE INDEX IF NOT EXISTS idx_attendance_election ON attendance_list(election_id);
CREATE INDEX IF NOT EXISTS idx_attendance_voter ON attendance_list(voter_id);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur election_id, user_id, created_at
CREATE INDEX IF NOT EXISTS idx_audit_election ON audit_logs(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Table des tâches planifiées
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur election_id et scheduled_for
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_election ON scheduled_tasks(election_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled ON scheduled_tasks(scheduled_for);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Optionnel mais recommandé
-- Décommentez si vous voulez utiliser RLS

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ballots ENABLE ROW LEVEL SECURITY;

-- Policies RLS exemple (à adapter selon vos besoins)
-- CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Admins can view their elections" ON elections FOR SELECT USING (auth.uid() = created_by);
