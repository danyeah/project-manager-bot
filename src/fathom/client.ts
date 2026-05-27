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

interface FathomMeetingItem {
  url: string;
  recording_id: number;
  share_url?: string;
  title?: string;
}

export class FathomClient {
  private apiKey: string;
  private baseUrl = 'https://api.fathom.ai/external/v1';

  constructor() {
    this.apiKey = config.FATHOM_API_KEY || '';
  }

  private async request(endpoint: string, params: Record<string, string> = {}) {
    if (!this.apiKey) {
      throw new Error('FATHOM_API_KEY not configured');
    }

    const query = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;
    
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

  /**
   * Cerca un meeting usando il call_id dall'URL e restituisce il recording_id
   */
  async findRecordingIdByCallId(callId: string): Promise<string | null> {
    try {
      const data = await this.request('/meetings', {
        limit: '100',
      });

      const items: FathomMeetingItem[] = data.items || [];

      // Cerca un meeting che matcha l'URL della call
      const match = items.find(item => 
        item.url?.includes(`/calls/${callId}`) ||
        item.share_url?.includes(callId)
      );

      if (match && match.recording_id) {
        return String(match.recording_id);
      }

      return null;

    } catch (err) {
      logger.error({ err, callId }, 'findRecordingIdByCallId failed');
      return null;
    }
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
