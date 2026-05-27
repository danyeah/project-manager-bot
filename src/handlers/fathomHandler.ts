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
  const callId = extractFathomRecordingId(message);
  if (!callId) return;

  logger.info({ callId, channelId }, 'fathom_link_detected');

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
    message: `📥 Sto cercando la registrazione Fathom...`,
  });

  try {
    // 1. Risolvi il vero recording_id dal call_id
    const recordingId = await fathomClient.findRecordingIdByCallId(callId);

    if (!recordingId) {
      await client.createPost({
        channel_id: channelId,
        message: `❌ Non sono riuscito a trovare la registrazione per questa call (ID: ${callId}).`,
      });
      return;
    }

    await client.createPost({
      channel_id: channelId,
      message: `📥 Recuperando summary e transcript della registrazione...`,
    });

    // 2. Recupera summary + transcript
    const [summaryData, transcriptData] = await Promise.all([
      fathomClient.getSummary(recordingId),
      fathomClient.getTranscript(recordingId),
    ]);

    const date = getTodayDate();
    const title = `Call ${date}`;

    const transcriptMarkdown = formatTranscript(transcriptData.segments);

    const content = `# ${title}

**Fathom Call ID:** \`${callId}\`  
**Recording ID:** \`${recordingId}\`

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
    logger.error({ err, callId }, 'fathom_processing_failed');
    await client.createPost({
      channel_id: channelId,
      message: `❌ Errore durante il recupero della call Fathom: ${err.message}`,
    });
  }
}
