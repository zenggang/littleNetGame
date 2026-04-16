type CoordinatorEnv = {
  baseUrl: string;
  sharedSecret: string;
};

export function readCoordinatorEnv(
  env: Record<string, string | undefined> = process.env,
): CoordinatorEnv {
  const baseUrl = env.COORDINATOR_BASE_URL;
  const sharedSecret = env.COORDINATOR_SHARED_SECRET;

  if (!baseUrl) {
    throw new Error("Missing COORDINATOR_BASE_URL");
  }

  if (!sharedSecret) {
    throw new Error("Missing COORDINATOR_SHARED_SECRET");
  }

  return { baseUrl, sharedSecret };
}
