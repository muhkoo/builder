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

/** This app's id — authorizes hosted sign-in (auth.muhkoo.dev). Register your
 *  callback URL in the developer portal (App Detail → Hosted sign-in). */
export function appId(): string {
  return import.meta.env.VITE_MUHKOO_APP_ID || "";
}

/** Optional hosted-auth SPA override (staging/dev). "" → the SDK default
 *  (auth.muhkoo.dev) applies. */
export function authBaseUrl(): string {
  return (import.meta.env.VITE_AUTH_URL ?? "").replace(/\/+$/, "");
}
