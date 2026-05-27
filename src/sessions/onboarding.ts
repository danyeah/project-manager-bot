import { MattermostClient } from '../mattermost/client.js';
import { createProject } from '../services/projectService.js';
import { logger } from '../logger.js';

interface OnboardingSession {
  channelId: string;
  channelName: string;
  displayName: string;
  step: number;
  data: {
    clientName?: string;
    deadline?: string;
    team?: string;
  };
}

const sessions = new Map<string, OnboardingSession>();

const QUESTIONS = [
  "Qual è il nome del **cliente**?",
  "Qual è la **deadline** principale? (es. 2026-12-31 o 'fine mese')",
  "Chi fa parte del **team**? (nomi o ruoli)"
];

export function startOnboarding(
  channelId: string,
  channelName: string,
  displayName: string,
  client: MattermostClient,
  botUserId: string
) {
  sessions.set(channelId, {
    channelId,
    channelName,
    displayName,
    step: 0,
    data: {}
  });

  client.createPost({
    channel_id: channelId,
    message: `👋 Ciao! Iniziamo la configurazione del progetto **${displayName}**.\n\nRispondi alle domande una alla volta.`
  });

  askNextQuestion(channelId, client);
}

function askNextQuestion(channelId: string, client: MattermostClient) {
  const session = sessions.get(channelId);
  if (!session) return;

  const question = QUESTIONS[session.step];
  if (!question) {
    finishOnboarding(channelId, client);
    return;
  }

  client.createPost({
    channel_id: channelId,
    message: question
  });
}

export async function handleOnboardingReply(
  channelId: string,
  message: string,
  userId: string,
  client: MattermostClient,
  botUserId: string
) {
  const session = sessions.get(channelId);
  if (!session) return;

  // Ignora messaggi del bot stesso
  if (userId === botUserId) return;

  // Ignora messaggi di sistema o troppo corti
  const cleanMessage = message.trim();
  if (cleanMessage.length < 2) return;
  if (cleanMessage.includes('added to the channel')) return;

  // Salva la risposta
  if (session.step === 0) session.data.clientName = cleanMessage;
  if (session.step === 1) session.data.deadline = cleanMessage;
  if (session.step === 2) session.data.team = cleanMessage;

  session.step++;

  if (session.step >= QUESTIONS.length) {
    await finishOnboarding(channelId, client, botUserId);
  } else {
    askNextQuestion(channelId, client);
  }
}

async function finishOnboarding(channelId: string, client: MattermostClient, botUserId?: string) {
  const session = sessions.get(channelId);
  if (!session) return;

  sessions.delete(channelId);

  await client.createPost({
    channel_id: channelId,
    message: "✅ Grazie! Creo il progetto con i dati inseriti..."
  });

  try {
    const result = await createProject({
      mmChannelId: channelId,
      mmChannelName: session.channelName,
      displayName: session.displayName,
      clientName: session.data.clientName,
      deadline: session.data.deadline,
      team: session.data.team,
      botUserId: botUserId || '',
    });

    const msg = `🎉 Progetto creato!\n- Collection: ${result.collection!.url}\n- Board Trello: ${result.trelloBoard!.url}`;
    await client.createPost({ channel_id: channelId, message: msg });

  } catch (err) {
    logger.error({ err }, 'onboarding_finish_failed');
    await client.createPost({
      channel_id: channelId,
      message: "❌ Errore durante la creazione del progetto."
    });
  }
}
