declare module "cloudflare:workers" {
  export class DurableObject<TEnv = unknown> {
    protected ctx: DurableObjectState;
    protected env: TEnv;

    constructor(ctx: DurableObjectState, env: TEnv);
  }

  export interface DurableObjectStorage {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    setAlarm(scheduledTime: number | Date): Promise<void>;
    deleteAlarm(): Promise<void>;
  }

  export interface DurableObjectState {
    storage: DurableObjectStorage;
    acceptWebSocket(webSocket: WebSocket): void;
    getWebSockets(): WebSocket[];
    blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  }
}

declare const WebSocketPair: {
  new (): {
    0: WebSocket;
    1: WebSocket;
  };
};
