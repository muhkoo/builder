/**
 * Thin React context over `client.auth.zk` (@muhkoo/connect 0.6.0-alpha.11).
 * Handles restoring a persisted session on load, and exposes register / login /
 * logout plus the recovery surface: passwordless passkey sign-in, enroll-passkey,
 * recovery phrase, change-password, and list/remove factors.
 *
 * The password is a recovery *factor*, not the source of keys — a random master
 * seed (same `commitment`) is wrapped per factor in a server-blind vault, so
 * accounts are un-lose-able. After `login()` / `loginWithPasskey()` the identity
 * is unlocked, which is what the database + encrypted channels need. If this app
 * ever encrypts per-user data itself, key it off `client.auth.zk.seedBase64`
 * (stable across password changes + present under passkey login), not the password.
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
  /** WebAuthn + PRF usable here → safe to offer passkeys. (`null` PRF → false.) */
  canPasskey: boolean;
  register: (username: string, password: string, email?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  loginWithPasskey: (username: string) => Promise<void>;
  recoverWithPhrase: (username: string, mnemonic: string) => Promise<void>;
  enrollPasskey: (label?: string) => Promise<void>;
  enrollRecoveryPhrase: () => Promise<string>;
  changePassword: (newPassword: string) => Promise<void>;
  listFactors: () => Promise<
    Array<{ id: string; type: "password" | "passkey" | "phrase-marker"; label?: string; createdAt?: string }>
  >;
  removeFactor: (id: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const zk = getClient().auth.zk;
        // Offer passkeys only when WebAuthn is usable AND PRF isn't a definite no.
        try {
          const prf = await zk.passkeyPrfAvailable(); // boolean | null (null = undeterminable)
          if (!cancelled) setCanPasskey(zk.passkeyAvailable() && prf !== false);
        } catch {
          /* leave passkeys off */
        }
        const user = await zk.restore();
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
      canPasskey,
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
      async loginWithPasskey(u) {
        const user = await getClient().auth.zk.loginWithPasskey(u);
        setUsername(user.username);
      },
      async recoverWithPhrase(u, mnemonic) {
        // Forgot-password path. The caller should follow with changePassword().
        const user = await getClient().auth.zk.recoverWithPhrase(u, mnemonic);
        setUsername(user.username);
      },
      async enrollPasskey(label) {
        await getClient().auth.zk.enrollPasskey({ label });
      },
      async enrollRecoveryPhrase() {
        // 24-word BIP39 phrase, returned ONCE — show it then forget it.
        return getClient().auth.zk.enrollRecoveryPhrase();
      },
      async changePassword(newPassword) {
        await getClient().auth.zk.changePassword(newPassword);
      },
      async listFactors() {
        return getClient().auth.zk.listFactors();
      },
      async removeFactor(id) {
        await getClient().auth.zk.removeFactor(id);
      },
      async logout() {
        await getClient().auth.zk.logout();
        setUsername(null);
      },
    }),
    [username, ready, canPasskey],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
