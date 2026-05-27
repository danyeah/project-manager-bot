import { trelloClient } from '../trello/client.js';
import { outlineClient } from '../outline/client.js';
import { createProjectPage } from '../outline/projectPage.js';
import { updateProjectsDashboard } from '../outline/dashboard.js';
import { insertChannel, findChannelByMmId } from '../db/repositories/channels.js';

interface CreateProjectInput {
  mmChannelId: string;
  mmChannelName: string;
  displayName: string;
  clientName?: string;
  deadline?: string;
  team?: string;
  botUserId: string;
}

export async function createProject(input: CreateProjectInput) {
  const existing = findChannelByMmId(input.mmChannelId);
  if (existing) {
    return { alreadyExists: true as const, channel: existing };
  }

  // 1. Create Trello Board
  const board = await trelloClient.createBoard(
    input.displayName,
    `Progetto: ${input.displayName}`
  );

  // 2. Create Outline Collection
  const collection = await outlineClient.createCollection(
    input.displayName,
    `Knowledge base for #${input.mmChannelName}`
  );

  // 3. Create "Scheda Progetto" page
  const projectPage = await createProjectPage(outlineClient, collection.id, {
    name: input.displayName,
    client: input.clientName,
    deadline: input.deadline,
    team: input.team,
    status: 'On Track',
  });

  // 4. Save to database
  insertChannel({
    mm_channel_id: input.mmChannelId,
    mm_channel_name: input.mmChannelName,
    outline_collection_id: collection.id,
    outline_page_id: projectPage.id,
    trello_board_id: board.id,
    status: 'On Track',
    deadline: input.deadline,
    client_name: input.clientName,
    created_by_user_id: input.botUserId,
  });

  // 5. Update Progetti Attivi dashboard
  try {
    await updateProjectsDashboard(outlineClient);
  } catch (err) {
    // Non bloccare la creazione del progetto se l'aggiornamento dashboard fallisce
    console.error('Dashboard update failed:', err);
  }

  return {
    alreadyExists: false as const,
    collection,
    projectPage,
    trelloBoard: board,
  };
}
