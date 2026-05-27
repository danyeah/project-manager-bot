import { fathomClient } from '../fathom/client.js';
import { extractFathomRecordingId, formatTranscript, getTodayDate } from '../fathom/utils.js';
import { findChannelByMmId } from '../db/repositories/channels.js';
import { outlineClient } from '../outline/client.js';
import { MattermostClient } from '../mattermost/client.js';
import { logger } from '../logger.js';

export async function handleFathomLink(
  channelId: string,
  message: string,
  client: MattermostClient
) {
  const recordingId = extractFathomRecordingId(message);
  if (!recordingId) return;

  logger.info({ recordingId, channelId }, 'fathom_link_detected');

  const project = findChannelByMmId(channelId);
  if (!project) {
    await client.createPost({
      channel_id: channelId,
      message: "⚠️ Questo canale non è configurato come progetto. Aggiungi prima il bot per configurarlo.",
    });
    return;
  }

  if (!project.outline_collection_id) {
    await client.createPost({
      channel_id: channelId,
      message: "⚠️ Collection Outline non trovata per questo progetto.",
    });
    return;
  }

  await client.createPost({
    channel_id: channelId,
    message: `📥 Sto recuperando il summary e il transcript della call Fathom...`,
  });

  try {
    const [summaryData, transcriptData] = await Promise.all([
      fathomClient.getSummary(recordingId),
      fathomClient.getTranscript(recordingId),
    ]);

    const date = getTodayDate();
    const title = `Call ${date}`;

    const transcriptMarkdown = formatTranscript(transcriptData.segments);

    const content = `# ${title}

**Fathom Recording ID:** \`${recordingId}\`

---

## Summary

${summaryData.summary || '_Nessun summary disponibile_'}

---

## Transcript

${transcriptMarkdown}
`;

    const doc = await outlineClient.createDocument({
      collectionId: project.outline_collection_id,
      title,
      text: content,
      publish: true,
    });

    await client.createPost({
      channel_id: channelId,
      message: `✅ Pagina creata: [${title}](${doc.url})`,
    });

  } catch (err: any) {
    logger.error({ err, recordingId }, 'fathom_processing_failed');
    await client.createPost({
      channel_id: channelId,
      message: `❌ Errore durante il recupero della call Fathom: ${err.message}`,
    });
  }
}
