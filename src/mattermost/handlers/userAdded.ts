import type { WsEvent } from '../websocket.js';
import type { MattermostClient } from '../client.js';
import type { OutlineClient } from '../../outline/client.js';
import { createProject } from '../../services/projectService.js';
import { config } from '../../config.js';

interface UserAddedCtx {
  client: MattermostClient;
  outlineClient: OutlineClient;
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

    const result = await createProject({
      mmChannelId: channel.id,
      mmChannelName: channel.name,
      displayName: channel.display_name || channel.name,
      botUserId,
    });

    if (result.alreadyExists) {
      await client.createPost({
        channel_id: channelId,
        message: '👋 Progetto già configurato.',
      });
      return;
    }

    const msg = `👋 Progetto creato!\n- Collection: ${result.collection!.url}\n- Board Trello: ${result.trelloBoard!.url}`;
    
    await client.createPost({
      channel_id: channelId,
      message: msg,
    });

  } catch (err) {
    logger.error({ err, channelId }, 'user_added_failed');
  }
}

