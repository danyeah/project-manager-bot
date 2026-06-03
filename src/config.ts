export interface Config {
  MM_URL: string;
  MM_BOT_TOKEN: string;
  MM_BOT_USERNAME: string;
  MM_BOT_USER_ID?: string;
  OUTLINE_URL: string;
  OUTLINE_API_TOKEN: string;
  PLANE_URL: string;
  PLANE_API_KEY: string;
  PLANE_WORKSPACE_SLUG: string;
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
  PLANE_URL: process.env.PLANE_URL || '',
  PLANE_API_KEY: process.env.PLANE_API_KEY || '',
  PLANE_WORKSPACE_SLUG: process.env.PLANE_WORKSPACE_SLUG || '',
  FATHOM_API_KEY: process.env.FATHOM_API_KEY || '',
  DB_PATH: process.env.DB_PATH || './data/projects.db',
  CLEANUP_INTERVAL_MINUTES: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60'),
};
