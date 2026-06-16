/**
 * subscribe — an optional Muhkoo serverless function for an email list.
 *
 * Accepts `POST { email }` from the static site's signup form and stores the
 * address in a Muhkoo database table (`subscribers`). No external services and
 * no secrets in the default path — it's self-contained on Muhkoo.
 *
 * Deploy it via the provision spec's `functions[]` (or `client.functions.deploy`)
 * with an HTTP trigger; it gets the URL `subscribe--<slug>.fns.muhkoo.dev`. Put
 * that URL in the site's `.env.local` as `VITE_SUBSCRIBE_URL`.
 *
 * Functions are a PAID-tier feature (deploy returns 402 on a free account) and
 * run on the Workers runtime — Web APIs only, no Node built-ins.
 *
 * Provision a `subscribers` table first (tables[] in the spec), e.g. columns:
 *   email TEXT (unique), source TEXT, created_at INTEGER.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const isEmail = (s) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return json(405, { error: "Method not allowed" });

    let email;
    try {
      ({ email } = await request.json());
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!isEmail(email)) return json(400, { error: "A valid email address is required" });

    // ALWAYS reach the platform through the service binding — same-account
    // worker-to-worker plain fetch() is blocked by Cloudflare (522).
    const api = (path, init) => env.MUHKOO_API.fetch(env.MUHKOO_API_URL + path, init);

    const res = await api("/api/db/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Muhkoo-Key": env.MUHKOO_APP_KEY },
      body: JSON.stringify({ email, source: "website", created_at: Date.now() }),
    });

    // A unique-constraint conflict means they're already subscribed — treat as success.
    if (res.status === 409) return json(200, { success: true, message: "You're already on the list!" });
    if (!res.ok) return json(500, { error: "Could not save your email. Try again." });

    return json(200, { success: true, message: "You're on the list. Thanks!" });

    // --- Optional: also forward to an external CRM / mailer (e.g. HubSpot,
    //     SendGrid, Mailgun). External URLs use plain fetch() — only the
    //     platform API must go through env.MUHKOO_API. Keep keys as PLACEHOLDERS
    //     in the committed file and substitute from env at provision time
    //     (function source is encrypted at rest; see references/decorators.md
    //     and the api-functions scaffold's "secrets-in-source" note).
  },
};
