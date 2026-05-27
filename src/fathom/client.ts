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

interface FathomMeeting {
  id: string;
  recording_id?: string;
  call_id?: string;
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
        'Authorization': `Bearer ${this.apiKey}`,
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
        limit: '50',
      });

      const meetings: FathomMeeting[] = data.meetings || data.data || [];

      // Cerca un meeting che matcha il call_id o lo share_url
      const match = meetings.find(m => 
        m.call_id === callId || 
        m.share_url?.includes(callId) ||
        m.id === callId
      );

      if (match && match.recording_id) {
        return match.recording_id;
      }

      // Se non troviamo nulla, proviamo a cercare per share_url
      const urlMatch = meetings.find(m => m.share_url?.includes(callId));
      return urlMatch?.recording_id || null;

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
