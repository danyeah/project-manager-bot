import { OutlineClient } from './client.js';
import { config } from '../config.js';

export interface OutlinePage {
  id: string;
  title: string;
  url: string;
}

export async function createProjectPage(
  outlineClient: OutlineClient,
  collectionId: string,
  projectData: {
    name: string;
    client?: string;
    deadline?: string;
    team?: string;
    status?: string;
    trelloBoardUrl?: string;
  }
): Promise<OutlinePage> {
  const title = `Scheda Progetto - ${projectData.name}`;

  const trelloLink = projectData.trelloBoardUrl 
    ? `[Apri Board](${projectData.trelloBoardUrl})` 
    : '-';

  const content = `# ${title}

## Informazioni generali
- **Cliente**: ${projectData.client || '-'}
- **Canale Mattermost**: 
- **Board Trello**: ${trelloLink}
- **Repository**: 
- **Data inizio**: 
- **Deadline principale**: ${projectData.deadline || '-'}
- **Stato**: ${projectData.status || 'On Track'}
- **Fase attuale**: Discovery

## Team
- **Project Manager**: 
- **Sviluppatori**: ${projectData.team || '-'}
- **Designer**: 

## Obiettivi e Scope
- **Obiettivo principale**:
- **Deliverable attesi**:
- **Scope out of scope**:

## Avanzamento
- **Stato complessivo**:
- **Prossime milestone**:

## Rischi e Blocchi

## Note importanti

## Link utili
`;

  const response = await outlineClient.createDocument({
    collectionId,
    title,
    text: content,
    publish: true,
  });

  return {
    id: response.id,
    title: response.title,
    url: response.url,
  };
}
