export interface MmUser {
  id: string;
  username: string;
}

export interface MmChannel {
  id: string;
  name: string;
  display_name: string;
  team_id: string;
  type: string;
}

export interface CreatePostInput {
  channel_id: string;
  message: string;
  root_id?: string;
}

export class MattermostClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly logger: any;

  constructor(baseUrl: string, token: string, logger: any) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.logger = logger;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}/api/v4${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error({ status: res.status, path, body: text }, 'mm_request_failed');
      throw new Error(`Mattermost ${method} ${path} -> ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  me(): Promise<MmUser> {
    return this.request<MmUser>('GET', '/users/me');
  }

  getChannel(channelId: string): Promise<MmChannel> {
    return this.request<MmChannel>('GET', `/channels/${channelId}`);
  }

  createPost(input: CreatePostInput): Promise<unknown> {
    return this.request('POST', '/posts', input);
  }
}
