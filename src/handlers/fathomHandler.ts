import { fathomClient } from '../fathom/client.js';
import { extractFathomRecordingId, getTodayDate } from '../fathom/utils.js';
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
      message: `📥 Recuperando dettagli della call...`,
    });

    // 2. Recupera i dettagli completi della meeting (include summary)
    const meeting = await fathomClient.getMeeting(recordingId);

    if (!meeting) {
      await client.createPost({
        channel_id: channelId,
        message: `❌ Non sono riuscito a recuperare i dettagli della call.`,
      });
      return;
    }

    const title = meeting.meeting_title || `Call ${getTodayDate()}`;
    const date = meeting.recording_start_time 
      ? new Date(meeting.recording_start_time).toLocaleDateString('it-IT')
      : getTodayDate();

    // Costruisci la sezione partecipanti
    const participants = (meeting.calendar_invitees || [])
      .map(p => `- **${p.name}** – [${p.email}](mailto:${p.email})`)
      .join('\n');

    const recordedBy = meeting.recorded_by 
      ? `[${meeting.recorded_by.name}](mailto:${meeting.recorded_by.email})`
      : 'Sconosciuto';

    const summary = meeting.default_summary?.markdown_formatted || '_Nessun summary disponibile_';

    const content = `# ${title}

**Data:** ${date}  
**Registrata da:** ${recordedBy}  
**Link Fathom:** [Apri su Fathom](${meeting.url})

---

### Partecipanti

${participants || '_Nessun partecipante_'}

---

### Riassunto

${summary}
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
