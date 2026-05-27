export type WsEvent = any;

export class MattermostWebSocket {
  constructor(private options: any) {}

  connect() {
    this.options.logger.info('websocket_connected (stub)');
  }

  close() {}
}

