/**
 * The app-wide `@muhkoo/connect` Client — the single object every feature talks
 * to (`client.auth.zk`, `client.db`, `client.space`, `client.kv`, …).
 *
 * Created lazily so config resolves at first use. The app key + base URL come
 * from the Vite env (`.env.local`); the session store defaults to localStorage,
 * so sign-in survives reloads.
 */
import { Client } from "@muhkoo/connect";
import { appKey, baseUrl } from "./config";

let _client: Client | null = null;

export function getClient(): Client {
  if (_client) return _client;
  _client = new Client({
    baseUrl: baseUrl(),
    apiKey: appKey(),
  });
  return _client;
}
