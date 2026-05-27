import { OutlineClient } from './client.js';
import { getAllActiveChannels } from '../db/repositories/channels.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

const DASHBOARD_TITLE = 'Progetti Attivi';

export async function updateProjectsDashboard(outlineClient: OutlineClient, dashboardPageId?: string) {
  const projects = getAllActiveChannels();

  let content = `# ${DASHBOARD_TITLE}

*Dashboard aggiornata automaticamente dal Project Manager Bot*

| Progetto | Cliente | Stato | Deadline | Collection | Trello |
|----------|---------|-------|----------|------------|--------|
`;

  if (projects.length === 0) {
    content += '| *Nessun progetto attivo* | - | - | - | - | - |\n';
  } else {
    for (const p of projects) {
      const status = p.status || 'On Track';
      const deadline = p.deadline || '-';
      const client = p.client_name || '-';
      const collectionUrl = p.outline_collection_id 
        ? `[Apri](${config.OUTLINE_URL}/collection/${p.outline_collection_id})` 
        : '-';
      const trelloUrl = p.trello_board_id 
        ? `[Board](https://trello.com/b/${p.trello_board_id})` 
        : '-';

      content += `| ${p.mm_channel_name} | ${client} | ${status} | ${deadline} | ${collectionUrl} | ${trelloUrl} |\n`;
    }
  }

  content += `

## Legenda Stati
- **On Track** → Progetto in linea
- **At Risk** → Rischio di ritardo
- **Delayed** → In ritardo
- **Completed** → Completato

*Ultimo aggiornamento: ${new Date().toLocaleString('it-IT')}*
`;

  try {
    if (dashboardPageId) {
      // Update existing page
      await outlineClient.updateDocument(dashboardPageId, {
        text: content,
        title: DASHBOARD_TITLE,
      });
      logger.info({ pageId: dashboardPageId }, 'dashboard_updated');
    } else {
      // Create new collection + page if not exists
      // For simplicity we create it in a dedicated collection or root
      const collection = await outlineClient.createCollection('Project Register', 'Registro centrale dei progetti attivi');
      
      const doc = await outlineClient.createDocument({
        collectionId: collection.id,
        title: DASHBOARD_TITLE,
        text: content,
        publish: true,
      });
      
      logger.info({ pageId: doc.id }, 'dashboard_created');
      return { collectionId: collection.id, pageId: doc.id };
    }
  } catch (err) {
    logger.error({ err }, 'dashboard_update_failed');
    throw err;
  }
}
