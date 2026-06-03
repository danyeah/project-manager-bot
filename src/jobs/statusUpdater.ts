import { getAllActiveChannels, updateChannelIsActive } from '../db/repositories/channels.js';
import { planeClient } from '../plane/client.js';
import { OutlineClient } from '../outline/client.js';
import { updateProjectsDashboard } from '../outline/dashboard.js';
import { mattermostClient } from '../mattermost/client.js';
import { logger } from '../logger.js';

export async function runStatusUpdater() {
  logger.info('status_updater_started');

  const channels = getAllActiveChannels();
  const outlineClient = new OutlineClient();

  for (const channel of channels) {
    if (!channel.plane_project_id) continue;

    try {
      const hasActive = await planeClient.hasActiveIssues(channel.plane_project_id);
      const isActive = hasActive || (channel as any).is_manually_activated === true;
      const previousStatus = channel.is_active ?? false;

      if (isActive !== previousStatus) {
        updateChannelIsActive(channel.mm_channel_id, isActive);

        await updateProjectsDashboard(outlineClient);

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
