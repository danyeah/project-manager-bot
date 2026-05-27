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

  async listCollections(): Promise<OutlineCollection[]> {
    const data = await this.request('/collections.list', {
      limit: 100,
    });

    return data.data.map((col: any) => ({
      id: col.id,
      name: col.name,
      url: `${this.baseUrl}/collection/${col.urlId || col.id}`,
    }));
  }

  async findCollectionByName(name: string): Promise<OutlineCollection | null> {
    const collections = await this.listCollections();
    return collections.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async getOrCreateCollection(name: string, description?: string): Promise<OutlineCollection> {
    try {
      return await this.createCollection(name, description);
    } catch (error: any) {
      if (error.message.includes('already exists') || 
          error.message.includes('unique') || 
          error.message.includes('409')) {
        
        logger.info({ name }, 'Collection already exists, searching for existing one');
        const existing = await this.findCollectionByName(name);
        
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
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

  /**
   * Cerca un documento per titolo (scansiona le prime collection)
   */
  async findDocumentByTitle(title: string): Promise<OutlineDocument | null> {
    try {
      const collections = await this.listCollections();
      
      for (const collection of collections.slice(0, 20)) {
        const data = await this.request('/documents.list', {
          collectionId: collection.id,
          limit: 50,
        });

        const found = data.data.find((doc: any) => 
          doc.title.toLowerCase() === title.toLowerCase()
        );

        if (found) {
          return {
            id: found.id,
            title: found.title,
            url: `${this.baseUrl}/doc/${found.urlId || found.id}`,
          };
        }
      }
    } catch (err) {
      logger.warn({ err }, 'findDocumentByTitle failed');
    }

    return null;
  }
}

export const outlineClient = new OutlineClient();