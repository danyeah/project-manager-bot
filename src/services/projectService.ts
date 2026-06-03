import { planeClient, type PlaneProject } from '../plane/client.js';
import { outlineClient, type OutlineCollection } from '../outline/client.js';
import { createProjectPage, type OutlinePage } from '../outline/projectPage.js';
import { updateProjectsDashboard } from '../outline/dashboard.js';
import { insertChannel, findChannelByMmId, type ChannelRow } from '../db/repositories/channels.js';

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
      planeProject: PlaneProject;
    };

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const existing = findChannelByMmId(input.mmChannelId);
  if (existing && existing.plane_project_id) {
    return { alreadyExists: true, channel: existing };
  }

  // 1. Create Plane Project
  const planeProject = await planeClient.createProject(
    input.displayName,
    `Progetto: ${input.displayName}`
  );

  // 2. Create or reuse Outline Collection
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
    planeBoardUrl: planeProject.url,
  });

  // 4. Save to database
  insertChannel({
    mm_channel_id: input.mmChannelId,
    mm_channel_name: input.mmChannelName,
    outline_collection_id: collection.id,
    outline_page_id: projectPage.id,
    plane_project_id: planeProject.id,
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
    planeProject,
  };
}
