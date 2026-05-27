export class MattermostClient {
  constructor(private url: string, private token: string, private logger: any) {}

  async getChannel(channelId: string) {
    // Placeholder - implement real call
    return { id: channelId, name: 'test', display_name: 'Test Channel', team_id: 'team' };
  }

  async createPost(data: any) {
    this.logger.info({ data }, 'create_post');
    // Placeholder
  }

  async me() {
    return { id: 'bot-id', username: 'pm-bot' };
  }

  async getMyTeams() {
    return [{ id: 'team1', name: 'main' }];
  }
}

