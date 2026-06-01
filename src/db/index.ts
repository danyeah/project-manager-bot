import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../logger.js';

export const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');

// The shared `channels` table is created by the kb-bot's migrations.
// The pm-bot needs additional columns to store Trello + project metadata.
// We add them idempotently here so pm-bot can run against a fresh kb-bot DB.
const existingCols = new Set(
  (db.prepare('PRAGMA table_info(channels)').all() as Array<{ name: string }>).map((r) => r.name),
);

const requiredCols: Array<[string, string]> = [
  ['outline_page_id', 'TEXT'],
  ['trello_board_id', 'TEXT'],
  ['status', 'TEXT'],
  ['deadline', 'TEXT'],
  ['client_name', 'TEXT'],
  ['is_active', 'INTEGER'],
  ['updated_at', 'TEXT'],
];

for (const [name, type] of requiredCols) {
  if (!existingCols.has(name)) {
    db.exec(`ALTER TABLE channels ADD COLUMN ${name} ${type}`);
    logger.info({ column: name }, 'pm_channels_column_added');
  }
}
