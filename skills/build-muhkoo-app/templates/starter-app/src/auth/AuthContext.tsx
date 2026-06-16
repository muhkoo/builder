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
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const client = getClient();
      try {
        if (client.auth.hosted.isCallback()) {
          const user = await client.auth.hosted.handleCallback();
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

  const value = useMemo<AuthState>(
    () => ({
      username,
      ready,
      async signIn() {
        await getClient().auth.hosted.login({ appId: appId(), redirectUri: window.location.origin });
      },
      async manageAccount() {
        await getClient().auth.hosted.manageAccount({ returnUri: window.location.href });
      },
      async logout() {
        await getClient().auth.zk.logout();
        setUsername(null);
      },
    }),
    [username, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
