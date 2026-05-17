-- Brennhub Supp Plan: Supplement library + compatibility rules
-- Database: brennhub-supp-plan (Cloudflare D1)

CREATE TABLE IF NOT EXISTS supplements (
  id TEXT PRIMARY KEY,
  name_kr TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL,
  solubility TEXT,
  metabolism TEXT,
  excretion TEXT,
  daily_recommended TEXT,
  recommended_state TEXT,
  effects TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_supplements_category ON supplements(category);
CREATE INDEX IF NOT EXISTS idx_supplements_solubility ON supplements(solubility);
CREATE INDEX IF NOT EXISTS idx_supplements_recommended_state ON supplements(recommended_state);

CREATE TABLE IF NOT EXISTS compatibility_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplement_a TEXT NOT NULL,
  supplement_b TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  notes TEXT,
  source TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (supplement_a) REFERENCES supplements(id),
  FOREIGN KEY (supplement_b) REFERENCES supplements(id)
);

CREATE INDEX IF NOT EXISTS idx_compatibility_supplement_a ON compatibility_rules(supplement_a);
CREATE INDEX IF NOT EXISTS idx_compatibility_supplement_b ON compatibility_rules(supplement_b);
CREATE INDEX IF NOT EXISTS idx_compatibility_rule_type ON compatibility_rules(rule_type);
