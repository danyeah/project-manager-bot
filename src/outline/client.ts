import { config } from '../config.js';
import { logger } from '../logger.js';

interface OutlineCollection {
  id: string;
  name: string;
  url: string;
}

interface OutlineDocument {
  id: string;
  title: string;
  url: string;
}

export class OutlineClient {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = config.OUTLINE_URL.replace(/\/$/, '');
    this.apiToken = config.OUTLINE_API_TOKEN;
  }

  private async request(endpoint: string, body: any) {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, `Outline API error on ${endpoint}`);
      throw new Error(`Outline API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createCollection(name: string, description?: string): Promise<OutlineCollection> {
    const data = await this.request('/collections.create', {
      name,
      description: description || `Knowledge base for ${name}`,
      color: '#3B82F6',
    });

    return {
      id: data.data.id,
      name: data.data.name,
      url: `${this.baseUrl}/collection/${data.data.urlId || data.data.id}`,
    };
  }

  async createDocument(params: {
    collectionId: string;
    title: string;
    text: string;
    publish?: boolean;
  }): Promise<OutlineDocument> {
    const data = await this.request('/documents.create', {
      collectionId: params.collectionId,
      title: params.title,
      text: params.text,
      publish: params.publish ?? true,
    });

    return {
      id: data.data.id,
      title: data.data.title,
      url: `${this.baseUrl}/doc/${data.data.urlId || data.data.id}`,
    };
  }

  async updateDocument(documentId: string, params: {
    text: string;
    title?: string;
  }): Promise<OutlineDocument> {
    const data = await this.request('/documents.update', {
      id: documentId,
      text: params.text,
      title: params.title,
    });

    return {
      id: data.data.id,
      title: data.data.title,
      url: `${this.baseUrl}/doc/${data.data.urlId || data.data.id}`,
    };
  }
}

export const outlineClient = new OutlineClient();