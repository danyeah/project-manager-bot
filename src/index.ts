import { config } from './config.js';
import { logger } from './logger.js';
import { MattermostClient } from './mattermost/client.js';
import { MattermostWebSocket } from './mattermost/websocket.js';
import { handleUserAdded } from './mattermost/handlers/userAdded.js';
import { handleOnboardingReply } from './sessions/onboarding.js';
import { handleFathomLink } from './handlers/fathomHandler.js';
import { outlineClient } from './outline/client.js';
import { startScheduler } from './jobs/scheduler.js';

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
        const message = post.message || '';
        const userId = post.user_id;

        if (userId === botUserId) return;

        // Fathom link detection
        if (message.includes('fathom.video/calls/')) {
          handleFathomLink(channelId, message, client);
          return;
        }

        // Onboarding questionnaire replies
        handleOnboardingReply(channelId, message, userId, client, botUserId);
      } catch (e) {
        // ignore malformed posts
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

  // Start the hourly status updater cron
  startScheduler();
}

main().catch((err) => {
  logger.error({ err }, 'fatal_error');
  process.exit(1);
});
