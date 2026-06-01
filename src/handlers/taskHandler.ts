import { MattermostClient } from '../mattermost/client.js';
import { trelloClient } from '../trello/client.js';
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

  const rest = match[1].trim();
  const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
  const mentions = [...rest.matchAll(mentionRegex)].map(m => m[1]);

  // Remove mentions from the text to get the title
  let title = rest.replace(mentionRegex, '').trim();

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
  if (!channel?.trello_board_id) {
    await client.postMessage(channelId, 'Questo canale non ha ancora una board Trello associata.');
    return;
  }

  const boardId = channel.trello_board_id;
  const assignedMemberIds: string[] = [];

  try {
    // 1. Get current board members
    const boardMembers = await trelloClient.getBoardMembers(boardId);
    const memberEmailMap = new Map(
      boardMembers.map((m: any) => [m.username?.toLowerCase(), m.id])
    );

    for (const username of parsed.assignees) {
      // 2. Get email from Mattermost
      const mmUser = await client.getUserByUsername(username);
      if (!mmUser?.email) {
        await client.postMessage(channelId, `Non riesco a trovare l'utente @${username} su Mattermost.`);
        continue;
      }

      // 3. Check if already on board
      let trelloMemberId = memberEmailMap.get(username.toLowerCase());

      if (!trelloMemberId) {
        // 4. Add to board using email
        try {
          const newMember = await trelloClient.addMemberToBoardByEmail(boardId, mmUser.email);
          trelloMemberId = newMember.id;
          logger.info({ username, email: mmUser.email }, 'member_added_to_board');
        } catch (err) {
          logger.error({ err, username }, 'failed_to_add_member');
          await client.postMessage(channelId, `Non sono riuscito ad aggiungere @${username} alla board Trello.`);
          continue;
        }
      }

      if (trelloMemberId) {
        assignedMemberIds.push(trelloMemberId);
      }
    }

    // 5. Find or create "To Do" list
    const todoList = await trelloClient.findOrCreateList(boardId, 'To Do');

    // 6. Create the card
    const card = await trelloClient.createCard(todoList.id, parsed.title);

    // 7. Assign members
    for (const memberId of assignedMemberIds) {
      await trelloClient.addMemberToCard(card.id, memberId);
    }

    // 8. Reply with link
    const link = card.url || `https://trello.com/c/${card.id}`;
    await client.postMessage(channelId, `✅ Task creato: [${parsed.title}](${link})`);

    logger.info({
      channel: channel.mm_channel_name,
      title: parsed.title,
      assignees: parsed.assignees,
    }, 'task_created');

  } catch (err) {
    logger.error({ err }, 'task_creation_failed');
    await client.postMessage(channelId, 'Si è verificato un errore durante la creazione del task.');
  }
}
