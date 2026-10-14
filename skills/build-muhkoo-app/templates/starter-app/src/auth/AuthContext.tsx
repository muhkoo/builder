/**
 * Thin React context over centralized hosted auth (`client.auth.hosted`,
 * @muhkoo/connect). Your app embeds NO login UI and no proving circuits — it
 * redirects to the Muhkoo-hosted sign-in page (auth.muhkoo.dev), which owns
 * register / sign-in / recovery and every factor (password, passkey, email,
 * Google). On return it hands back a session + the master seed.
 *
 * On load: if we just returned from the hosted page (a `?code` callback) we
 * complete the handoff; otherwise we restore a persisted session. This template
 * is a single page, so the callback lands on the app root and `isCallback()`
 * detects it — no dedicated callback route needed.
 *
 * Encrypted channels + per-user data need an *unlocked* identity. The hosted
 * handoff establishes it; after a fresh page reload the session restores but the
 * seed isn't persisted, so we treat that as signed-out and prompt a quick
 * re-sign-in (one tap; the hosted page remembers the user).
 *
 * Sign-out: the hosted page can remember a browser ("Keep me signed in"), so a
 * plain sign-in right after our own sign-out would land the user straight back
 * in. After `logout()` the next `signIn()` passes `prompt: "login"` to ask for
 * credentials anyway.
 *
 * Access: an app can be "Paid Muhkoo accounts only", and an app whose owner's
 * payment is past due refuses new data for everyone. After sign-in, and each
 * time the tab becomes visible again (the user may be back from the portal's
 * upgrade page), we ask `client.app.access()` and expose a refusal as `access`
 * for the upgrade banner in the app shell. Don't call it from a SYNC_COMPLETE
 * handler: each `allowed` answer starts another sync.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppAccess } from "@muhkoo/connect";
import { getClient } from "../lib/client";
import { appId } from "../lib/config";

interface AuthState {
  username: string | null;
  ready: boolean;
  /** Redirect to the hosted sign-in page (auth.muhkoo.dev). */
  signIn: () => Promise<void>;
  /** Open centralized account & security management (auth.muhkoo.dev/security) —
   *  manage passkeys, recovery email, Google, recovery phrase, and password. */
  manageAccount: () => Promise<void>;
  logout: () => Promise<void>;
  /** Set when this user may not add data in this app (paid-only app, or a
   *  payment past due) — show an upgrade banner. Null when allowed / unknown. */
  access: AppAccess | null;
}

/** Remembers that the user signed out of THIS app, across reloads, until the
 *  next completed sign-in. */
const SIGNED_OUT_KEY = "muhkoo-app:signed-out";

function markSignedOut(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_OUT_KEY, "1");
    else localStorage.removeItem(SIGNED_OUT_KEY);
  } catch { /* storage blocked — best-effort */ }
}

function wasSignedOut(): boolean {
  try { return localStorage.getItem(SIGNED_OUT_KEY) === "1"; } catch { return false; }
}

/** `client.app.access()`, failing open: an older server answers 404, and the
 *  server enforces the gate either way — a wrong "allowed" only costs a refused
 *  write, which the features report via `describeError`. */
async function checkAccess(): Promise<AppAccess | null> {
  try {
    const access = await getClient().app.access();
    return access.allowed ? null : access;
  } catch {
    return null;
  }
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<AppAccess | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = getClient();
      try {
        if (client.auth.hosted.isCallback()) {
          const user = await client.auth.hosted.handleCallback();
          markSignedOut(false);
          if (!cancelled) setUsername(user.username);
        } else {
          const user = await client.auth.zk.restore();
          // Only "signed in" if the identity is unlocked (channels/data need it).
          if (!cancelled && user && client.auth.zk.identity) setUsername(user.username);
        }
      } catch {
        // No session / failed callback — show the sign-in screen.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ask whether this user may add data — after sign-in, and on return to the tab.
  useEffect(() => {
    if (!username) {
      setAccess(null);
      return;
    }
    let cancelled = false;
    const check = () => void checkAccess().then((a) => { if (!cancelled) setAccess(a); });
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [username]);

  const value = useMemo<AuthState>(
    () => ({
      username,
      ready,
      async signIn() {
        await getClient().auth.hosted.login({
          appId: appId(),
          redirectUri: window.location.origin,
          // After our own sign-out, ask for credentials rather than resuming the
          // remembered browser — otherwise sign-out looks like it did nothing.
          ...(wasSignedOut() ? { prompt: "login" as const } : {}),
        });
      },
      async manageAccount() {
        await getClient().auth.hosted.manageAccount({ returnUri: window.location.href });
      },
      async logout() {
        await getClient().auth.zk.logout();
        markSignedOut(true);
        setUsername(null);
      },
      access,
    }),
    [username, ready, access],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
