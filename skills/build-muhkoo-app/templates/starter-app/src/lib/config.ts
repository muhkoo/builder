/** API base URL handed to the @muhkoo/connect Client. */
export function baseUrl(): string {
  const fromEnv = import.meta.env.VITE_WORKER_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  // Sensible default: the production API.
  return "https://api.muhkoo.dev";
}

/** The publishable app key (mk_test_pk_… / mk_live_pk_…). */
export function appKey(): string | undefined {
  return import.meta.env.VITE_MUHKOO_KEY || undefined;
}
