import { MatchRoom } from "./durable-objects/MatchRoom";

export { MatchRoom };

export interface Env {
  MATCH_ROOM: {
    getByName: (name: string) => {
      fetch: (request: Request) => Promise<Response>;
    };
  };
  COORDINATOR_SHARED_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomCode = url.pathname.split("/")[2] ?? "default";
    const stub = env.MATCH_ROOM.getByName(`room:${roomCode}`);

    return stub.fetch(request);
  },
};

export default worker;
