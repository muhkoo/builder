/**
 * Thin React context over `client.auth.zk`. Handles restoring a persisted
 * session on load, and exposes register / login / logout. After `login()` the
 * identity is unlocked, which is what the database + encrypted channels need.
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

interface AuthState {
  username: string | null;
  ready: boolean;
  register: (username: string, password: string, email?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getClient().auth.zk.restore();
        if (!cancelled && user) setUsername(user.username);
      } catch {
        // no persisted session — fine
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      username,
      ready,
      async register(u, p, email) {
        // Register, then log in (which unlocks the identity for crypto).
        await getClient().auth.zk.register({ username: u, password: p, email: email ?? null, login: false });
        await getClient().auth.zk.login(u, p);
        setUsername(u);
      },
      async login(u, p) {
        const user = await getClient().auth.zk.login(u, p);
        setUsername(user.username);
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
