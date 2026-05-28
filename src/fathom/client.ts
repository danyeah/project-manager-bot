import { config } from '../config.js';
import { logger } from '../logger.js';

interface FathomSummary {
  summary: string;
  title?: string;
}

interface FathomTranscriptSegment {
  speaker_name: string;
  text: string;
  timestamp: number; // seconds
}

interface FathomTranscript {
  segments: FathomTranscriptSegment[];
}

interface FathomMeetingItem {
  url: string;
  recording_id: number;
  share_url?: string;
  title?: string;
  meeting_title?: string;
  recording_start_time?: string;
  recorded_by?: {
    name: string;
    email: string;
  };
  calendar_invitees?: Array<{
    name: string;
    email: string;
  }>;
  default_summary?: {
    markdown_formatted?: string;
  };
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

  async findRecordingIdByCallId(callId: string): Promise<string | null> {
    try {
      const data = await this.request('/meetings', {
        limit: '100',
        include_summary: 'true',
      });

      const items: FathomMeetingItem[] = data.items || [];

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

  async getMeeting(recordingId: string): Promise<FathomMeetingItem | null> {
    try {
      const data = await this.request('/meetings', {
        limit: '100',
        include_summary: 'true',
      });

      const items: FathomMeetingItem[] = data.items || [];
      const match = items.find(item => String(item.recording_id) === String(recordingId));

      return match || null;
    } catch (err) {
      logger.error({ err, recordingId }, 'getMeeting failed');
      return null;
    }
  }

  async getSummary(recordingId: string): Promise<FathomSummary> {
    const data = await this.request(`/recordings/${recordingId}/summary`);
    
    return {
      summary: data.summary?.markdown_formatted || '',
      title: data.title,
    };
  }

  async getTranscript(recordingId: string): Promise<FathomTranscript> {
    const data = await this.request(`/recordings/${recordingId}/transcript`);
    
    const segments = (data.transcript || []).map((item: any) => {
      // Converte "00:05:32" in secondi
      let seconds = 0;
      if (item.timestamp) {
        const parts = item.timestamp.split(':').map(Number);
        if (parts.length === 3) {
          seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          seconds = parts[0] * 60 + parts[1];
        }
      }

      return {
        speaker_name: item.speaker?.display_name || 'Speaker',
        text: item.text || '',
        timestamp: seconds,
      };
    });

    return { segments };
  }
}

export const fathomClient = new FathomClient();
