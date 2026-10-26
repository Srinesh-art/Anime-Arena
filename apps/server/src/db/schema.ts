import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_URL || path.resolve(process.cwd(), 'anime_arena.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anime (
      id TEXT PRIMARY KEY,
      franchise_id TEXT NOT NULL,
      canonical_title TEXT NOT NULL,
      english_title TEXT,
      original_title TEXT,
      description TEXT,
      cover_image TEXT,
      genres TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      canonical_id TEXT NOT NULL,
      anime_id TEXT NOT NULL,
      franchise TEXT NOT NULL,
      name TEXT NOT NULL,
      original_name TEXT,
      aliases TEXT,
      form TEXT DEFAULT 'Base',
      image_url TEXT,
      role TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (anime_id) REFERENCES anime(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chars_canonical ON characters(canonical_id);
    CREATE INDEX IF NOT EXISTS idx_chars_franchise ON characters(franchise);
    CREATE INDEX IF NOT EXISTS idx_chars_name ON characters(name);

    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host_id TEXT NOT NULL,
      settings TEXT NOT NULL,
      phase TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_history (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      settings TEXT NOT NULL,
      results_json TEXT NOT NULL,
      completed_at INTEGER NOT NULL
    );
  `);
}
