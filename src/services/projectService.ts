import { trelloClient } from '../trello/client.js';
import { outlineClient, type OutlineCollection } from '../outline/client.js';
import { createProjectPage, type OutlinePage } from '../outline/projectPage.js';
import { updateProjectsDashboard } from '../outline/dashboard.js';
import { insertChannel, findChannelByMmId, type ChannelRow } from '../db/repositories/channels.js';
import type { TrelloBoard } from '../trello/client.js';

interface CreateProjectInput {
  mmChannelId: string;
  mmChannelName: string;
  displayName: string;
  clientName?: string;
  deadline?: string;
  team?: string;
  botUserId: string;
}

export type CreateProjectResult =
  | { alreadyExists: true; channel: ChannelRow }
  | {
      alreadyExists: false;
      collection: OutlineCollection;
      projectPage: OutlinePage;
      trelloBoard: TrelloBoard;
    };

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const existing = findChannelByMmId(input.mmChannelId);
  if (existing) {
    return { alreadyExists: true, channel: existing };
  }

  // 1. Create Trello Board
  const board = await trelloClient.createBoard(
    input.displayName,
    `Progetto: ${input.displayName}`
  );

  // 2. Create or reuse Outline Collection (handles duplicate names)
  const collection = await outlineClient.getOrCreateCollection(
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
    console.error('Dashboard update failed:', err);
  }

  return {
    alreadyExists: false,
    collection,
    projectPage,
    trelloBoard: board,
  };
}
