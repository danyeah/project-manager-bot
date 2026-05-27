import { config } from './config.js';
import { logger } from './logger.js';
import { MattermostClient } from './mattermost/client.js';
import { MattermostWebSocket } from './mattermost/websocket.js';
import { handleUserAdded } from './mattermost/handlers/userAdded.js';
import { handleOnboardingReply } from './sessions/onboarding.js';
import { outlineClient } from './outline/client.js';

async function main() {
  logger.info({ mm_url: config.MM_URL }, 'project-manager-bot starting');

  const client = new MattermostClient(config.MM_URL, config.MM_BOT_TOKEN, logger);

  const botUserId: string = config.MM_BOT_USER_ID || (await client.me()).id;

  function dispatch(event: any) {
    if (event.event === 'user_added') {
      handleUserAdded(event, { client, logger, botUserId });
    }

    if (event.event === 'posted') {
      try {
        const post = JSON.parse(event.data.post);
        const channelId = post.channel_id;
        const message = post.message?.trim();

        // Ignora i messaggi del bot stesso
        if (post.user_id === botUserId) return;

        // Gestisce le risposte al questionario
        handleOnboardingReply(channelId, message, client, botUserId);
      } catch (e) {
        // ignora post malformati
      }
    }
  }

  const ws = new MattermostWebSocket({
    url: config.MM_URL,
    token: config.MM_BOT_TOKEN,
    logger,
    dispatch,
  });

  ws.connect();
  logger.info('bot_ready');
}

main().catch((err) => {
  logger.error({ err }, 'fatal_error');
  process.exit(1);
});
