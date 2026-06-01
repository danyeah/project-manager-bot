import { getAllActiveChannels, updateChannelIsActive } from '../db/repositories/channels.js';
import { trelloClient } from '../trello/client.js';
import { OutlineClient } from '../outline/client.js';
import { updateProjectsDashboard } from '../outline/dashboard.js';
import { mattermostClient } from '../mattermost/client.js';
import { logger } from '../logger.js';
import { config } from '../config.js';

const ACTIVE_LISTS = ['To Do', 'Doing', 'Backlog'];

export async function runStatusUpdater() {
  logger.info('status_updater_started');

  const channels = getAllActiveChannels();
  const outlineClient = new OutlineClient();

  for (const channel of channels) {
    if (!channel.trello_board_id) continue;

    try {
      const hasActiveCards = await trelloClient.hasActiveCards(
        channel.trello_board_id,
        ACTIVE_LISTS
      );

      const isActive = hasActiveCards || (channel as any).is_manually_activated === true;
      const previousStatus = channel.is_active ?? false;

      if (isActive !== previousStatus) {
        // Update DB
        updateChannelIsActive(channel.mm_channel_id, isActive);

        // Update dashboard
        await updateProjectsDashboard(outlineClient);

        // Notify Mattermost channel
        const statusText = isActive ? '🟢 Attivo' : '⚪️ Inattivo';
        await mattermostClient.postMessage(
          channel.mm_channel_id,
          `**Project Status Update**\nIl progetto è ora: **${statusText}**`
        );

        logger.info({
          channel: channel.mm_channel_name,
          is_active: isActive,
        }, 'project_status_changed');
      }
    } catch (err) {
      logger.error({ err, channel: channel.mm_channel_name }, 'status_check_failed');
    }
  }

  logger.info('status_updater_completed');
}
