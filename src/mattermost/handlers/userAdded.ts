import type { WsEvent } from '../websocket.js';
import type { MattermostClient } from '../client.js';
import { startOnboarding } from '../../sessions/onboarding.js';
import { logger } from '../../logger.js';

interface UserAddedCtx {
  client: MattermostClient;
  logger: any;
  botUserId: string;
}

export async function handleUserAdded(event: WsEvent, ctx: UserAddedCtx) {
  const { client, logger, botUserId } = ctx;

  if (event.data.user_id !== botUserId) return;

  const channelId = event.broadcast.channel_id;

  try {
    const channel = await client.getChannel(channelId);
    logger.info({ channel: channel.name }, 'bot_added_to_channel');

    // Avvia il questionario interattivo invece di creare subito il progetto
    startOnboarding(channelId, client, botUserId);

  } catch (err) {
    logger.error({ err, channelId }, 'user_added_failed');
  }
}
