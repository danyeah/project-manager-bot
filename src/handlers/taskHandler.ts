import { MattermostClient } from '../mattermost/client.js';
import { planeClient } from '../plane/client.js';
import { findChannelByMmId } from '../db/repositories/channels.js';
import { logger } from '../logger.js';

interface ParsedTaskCommand {
  assignees: string[]; // Mattermost usernames
  title: string;
}

export function parseTaskCommand(message: string): ParsedTaskCommand | null {
  const regex = /@pm-bot\s+task\s+(.*)/i;
  const match = message.match(regex);
  if (!match) return null;

  const rest = (match[1] ?? '').trim();
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const mentions: string[] = [...rest.matchAll(mentionRegex)]
    .map(m => m[1])
    .filter((x): x is string => x !== undefined);

  const title = rest.replace(mentionRegex, '').trim();

  return {
    assignees: mentions,
    title: title || 'Untitled task',
  };
}

export async function handleTaskCommand(
  channelId: string,
  message: string,
  client: MattermostClient,
  botUserId: string
) {
  const parsed = parseTaskCommand(message);
  if (!parsed || !parsed.title) {
    await client.postMessage(channelId, 'Uso: `@pm-bot task @username titolo del task`');
    return;
  }

  const channel = findChannelByMmId(channelId);
  if (!channel?.plane_project_id) {
    await client.postMessage(channelId, 'Questo canale non ha ancora un progetto Plane associato.');
    return;
  }

  const projectId = channel.plane_project_id;
  const assignedMemberIds: string[] = [];

  try {
    // 1. Fetch all workspace members once
    const workspaceMembers = await planeClient.getWorkspaceMembers();
    const memberByEmail = new Map(workspaceMembers.map(m => [m.email, m]));

    for (const username of parsed.assignees) {
      // 2. Resolve Mattermost username → email
      const mmUser = await client.getUserByUsername(username);
      if (!mmUser?.email) {
        await client.postMessage(channelId, `Non riesco a trovare @${username} su Mattermost.`);
        continue;
      }

      const email = mmUser.email.toLowerCase();
      const workspaceMember = memberByEmail.get(email);

      if (!workspaceMember) {
        await client.postMessage(
          channelId,
          `@${username} non è ancora membro del workspace Plane. Invitalo prima da ${process.env.PLANE_URL}.`
        );
        continue;
      }

      // 3. Ensure they are a member of this project
      try {
        await planeClient.addMemberToProject(projectId, workspaceMember.memberId);
      } catch (err) {
        logger.warn({ err, username }, 'failed_to_add_member_to_project');
      }

      assignedMemberIds.push(workspaceMember.memberId);
    }

    // 4. Create the issue
    const issue = await planeClient.createIssue(projectId, parsed.title, assignedMemberIds);

    await client.postMessage(channelId, `✅ Issue creata: [${parsed.title}](${issue.url})`);

    logger.info({
      channel: channel.mm_channel_name,
      title: parsed.title,
      assignees: parsed.assignees,
    }, 'issue_created');

  } catch (err) {
    logger.error({ err }, 'issue_creation_failed');
    await client.postMessage(channelId, 'Si è verificato un errore durante la creazione dell\'issue.');
  }
}
