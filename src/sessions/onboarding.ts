import { MattermostClient } from '../mattermost/client.js';
import { createProject } from '../services/projectService.js';
import { logger } from '../logger.js';

interface OnboardingSession {
  channelId: string;
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

export function startOnboarding(channelId: string, client: MattermostClient, botUserId: string) {
  sessions.set(channelId, {
    channelId,
    step: 0,
    data: {}
  });

  client.createPost({
    channel_id: channelId,
    message: "👋 Ciao! Iniziamo la configurazione del progetto.\n\nRispondi alle domande una alla volta."
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

export async function handleOnboardingReply(channelId: string, message: string, client: MattermostClient, botUserId: string) {
  const session = sessions.get(channelId);
  if (!session) return;

  // Salva la risposta
  if (session.step === 0) session.data.clientName = message.trim();
  if (session.step === 1) session.data.deadline = message.trim();
  if (session.step === 2) session.data.team = message.trim();

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
      mmChannelName: channelId, // TODO: recuperare il nome reale
      displayName: channelId,
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
