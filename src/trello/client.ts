import { config } from '../config.js';

export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  url: string;
  idBoard: string;
}

export class TrelloClient {
  private apiKey: string;
  private apiToken: string;
  private baseUrl = 'https://api.trello.com/1';

  constructor() {
    this.apiKey = config.TRELLO_API_KEY;
    this.apiToken = config.TRELLO_API_TOKEN;
  }

  private getAuthParams(): string {
    return `key=${this.apiKey}&token=${this.apiToken}`;
  }

  async createBoard(name: string, description?: string): Promise<TrelloBoard> {
    const params = new URLSearchParams({
      name,
      desc: description || '',
      defaultLists: 'true',
    });

    const url = `${this.baseUrl}/boards?${params.toString()}&${this.getAuthParams()}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to create Trello board: ${response.statusText}`);
    }
    return response.json();
  }

  async getBoardLists(boardId: string) {
    const url = `${this.baseUrl}/boards/${boardId}/lists?${this.getAuthParams()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Trello lists');
    return response.json();
  }

  async getListCards(listId: string) {
    const url = `${this.baseUrl}/lists/${listId}/cards?${this.getAuthParams()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch Trello cards');
    return response.json();
  }

  async hasActiveCards(boardId: string, activeListNames: string[]): Promise<boolean> {
    const lists = await this.getBoardLists(boardId);
    const activeLists = lists.filter((l: any) =>
      activeListNames.some(name => l.name.toLowerCase().includes(name.toLowerCase()))
    );

    for (const list of activeLists) {
      const cards = await this.getListCards(list.id);
      if (cards.length > 0) return true;
    }
    return false;
  }

  // === NEW METHODS FOR TASK CREATION ===

  async getBoardMembers(boardId: string) {
    const url = `${this.baseUrl}/boards/${boardId}/members?${this.getAuthParams()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch board members');
    return response.json();
  }

  async addMemberToBoardByEmail(boardId: string, email: string) {
    const params = new URLSearchParams({
      email,
      type: 'normal',
    });

    const url = `${this.baseUrl}/boards/${boardId}/members?${params.toString()}&${this.getAuthParams()}`;
    const response = await fetch(url, { method: 'PUT' });
    if (!response.ok) {
      throw new Error(`Failed to add member to board: ${response.statusText}`);
    }
    return response.json();
  }

  async findOrCreateList(boardId: string, listName: string = 'To Do') {
    const lists = await this.getBoardLists(boardId);
    let list = lists.find((l: any) => l.name.toLowerCase() === listName.toLowerCase());

    if (!list) {
      // Create the list if it doesn't exist
      const params = new URLSearchParams({ name: listName, idBoard: boardId });
      const url = `${this.baseUrl}/lists?${params.toString()}&${this.getAuthParams()}`;
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to create list');
      list = await response.json();
    }
    return list;
  }

  async createCard(listId: string, name: string, desc?: string): Promise<TrelloCard> {
    const params = new URLSearchParams({
      idList: listId,
      name,
      desc: desc || '',
    });

    const url = `${this.baseUrl}/cards?${params.toString()}&${this.getAuthParams()}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to create card: ${response.statusText}`);
    }
    return response.json();
  }

  async addMemberToCard(cardId: string, memberId: string) {
    const url = `${this.baseUrl}/cards/${cardId}/idMembers?value=${memberId}&${this.getAuthParams()}`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to assign member to card: ${response.statusText}`);
    }
    return response.json();
  }
}

export const trelloClient = new TrelloClient();
