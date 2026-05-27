export interface Config {
  MM_URL: string;
  MM_BOT_TOKEN: string;
  MM_BOT_USERNAME: string;
  MM_BOT_USER_ID?: string;
  OUTLINE_URL: string;
  OUTLINE_API_TOKEN: string;
  TRELLO_API_KEY: string;
  TRELLO_API_TOKEN: string;
  FATHOM_API_KEY: string;
  DB_PATH: string;
  CLEANUP_INTERVAL_MINUTES: number;
}

export const config: Config = {
  MM_URL: process.env.MM_URL || '',
  MM_BOT_TOKEN: process.env.MM_BOT_TOKEN || '',
  MM_BOT_USERNAME: process.env.MM_BOT_USERNAME || 'pm-bot',
  MM_BOT_USER_ID: process.env.MM_BOT_USER_ID,
  OUTLINE_URL: process.env.OUTLINE_URL || '',
  OUTLINE_API_TOKEN: process.env.OUTLINE_API_TOKEN || '',
  TRELLO_API_KEY: process.env.TRELLO_API_KEY || '',
  TRELLO_API_TOKEN: process.env.TRELLO_API_TOKEN || '',
  FATHOM_API_KEY: process.env.FATHOM_API_KEY || '',
  DB_PATH: process.env.DB_PATH || './data/projects.db',
  CLEANUP_INTERVAL_MINUTES: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60'),
};
