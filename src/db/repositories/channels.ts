import Database from 'better-sqlite3';
import { config } from '../config.js';

export interface ChannelRow {
  mm_channel_id: string;
  mm_channel_name: string;
  outline_collection_id: string;
  outline_page_id?: string;
  trello_board_id?: string;
  status?: string;
  deadline?: string;
  client_name?: string;
  created_at: string;
  updated_at?: string;
  created_by_user_id: string;
}

const db = new Database(config.DB_PATH);

export function findChannelByMmId(mmChannelId: string): ChannelRow | null {
  const stmt = db.prepare('SELECT * FROM channels WHERE mm_channel_id = ?');
  return (stmt.get(mmChannelId) as ChannelRow | undefined) ?? null;
}

export function getAllActiveChannels(): ChannelRow[] {
  const stmt = db.prepare(`
    SELECT * FROM channels 
    ORDER BY created_at DESC
  `);
  return stmt.all() as ChannelRow[];
}

export function insertChannel(row: Omit<ChannelRow, 'created_at' | 'updated_at'>): void {
  const stmt = db.prepare(`
    INSERT INTO channels (
      mm_channel_id, mm_channel_name, outline_collection_id, 
      outline_page_id, trello_board_id, status, deadline, 
      client_name, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    row.mm_channel_id,
    row.mm_channel_name,
    row.outline_collection_id,
    row.outline_page_id ?? null,
    row.trello_board_id ?? null,
    row.status ?? null,
    row.deadline ?? null,
    row.client_name ?? null,
    row.created_by_user_id
  );
}

export function updateChannelStatus(mmChannelId: string, status: string): void {
  const stmt = db.prepare(`
    UPDATE channels 
    SET status = ?, updated_at = datetime('now')
    WHERE mm_channel_id = ?
  `);
  stmt.run(status, mmChannelId);
}
