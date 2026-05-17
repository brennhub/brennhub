CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  tool TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  user_agent TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_tool ON feedback(tool);
