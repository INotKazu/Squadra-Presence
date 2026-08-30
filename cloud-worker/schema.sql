CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY,
  verifier_hash TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL
);
