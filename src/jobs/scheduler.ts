import { runStatusUpdater } from './statusUpdater.js';
import { logger } from '../logger.js';

const ONE_HOUR = 60 * 60 * 1000;

export function startScheduler() {
  logger.info('scheduler_started');

  // Run immediately on start
  runStatusUpdater().catch(err => {
    logger.error({ err }, 'initial_status_update_failed');
  });

  // Then run every hour
  setInterval(() => {
    runStatusUpdater().catch(err => {
      logger.error({ err }, 'scheduled_status_update_failed');
    });
  }, ONE_HOUR);
}
