import { config } from '../config.js';
import { logger } from '../logger.js';

interface FathomSummary {
  summary: string;
  title?: string;
}

interface FathomTranscriptSegment {
  speaker_name: string;
  text: string;
  timestamp: number;
}

interface FathomTranscript {
  segments: FathomTranscriptSegment[];
}

export class FathomClient {
  private apiKey: string;
  private baseUrl = 'https://api.fathom.ai/external/v1';

  constructor() {
    this.apiKey = config.FATHOM_API_KEY || '';
  }

  private async request(endpoint: string) {
    if (!this.apiKey) {
      throw new Error('FATHOM_API_KEY not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, `Fathom API error on ${endpoint}`);
      throw new Error(`Fathom API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getSummary(recordingId: string): Promise<FathomSummary> {
    const data = await this.request(`/recordings/${recordingId}/summary`);
    return {
      summary: data.summary || '',
      title: data.title,
    };
  }

  async getTranscript(recordingId: string): Promise<FathomTranscript> {
    const data = await this.request(`/recordings/${recordingId}/transcript`);
    return {
      segments: data.segments || [],
    };
  }
}

export const fathomClient = new FathomClient();
