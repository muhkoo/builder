/** Register / login screen using Muhkoo ZK auth, with passwordless passkey
 *  sign-in and a forgot-password (recovery-phrase) flow. */
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "./AuthContext";
import { APP_NAME } from "../appConfig";

type Mode = "login" | "register" | "recover";

export function AuthScreen() {
  const { login, register, loginWithPasskey, recoverWithPhrase, changePassword, canPasskey } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await register(username, password, email || undefined);
      else if (mode === "recover") {
        await recoverWithPhrase(username, mnemonic.trim());
        // recoverWithPhrase doesn't set a password — set the new one now.
        await changePassword(password);
      } else await login(username, password);
    } catch (e) {
      // VaultUnavailableError means "retry", not "wrong password" — surface the raw message.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setError(null);
    try {
      await loginWithPasskey(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }} data-cy="auth-screen">
      <Card sx={{ width: "100%", maxWidth: 380 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            {APP_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Zero-knowledge sign-in — your password never leaves this device.
          </Typography>

          {mode !== "recover" && (
            <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
              <Tab value="login" label="Log in" data-cy="tab-login" />
              <Tab value="register" label="Register" data-cy="tab-register" />
            </Tabs>
          )}

          <Stack
            component="form"
            spacing={2}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            {mode === "recover" && (
              <TextField
                label="Recovery phrase (24 words)"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                multiline
                minRows={2}
                required
                data-cy="recovery-phrase"
                helperText="The phrase you saved when you set up recovery."
              />
            )}

            <TextField
              label={mode === "recover" ? "New password" : "Password"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />

            {mode === "register" && (
              <TextField
                label="Email (optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            )}

            {error && (
              <Alert severity="error" data-cy="auth-error">
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={busy || !username || !password || (mode === "recover" && !mnemonic.trim())}
              data-cy="auth-submit"
            >
              {busy
                ? "…"
                : mode === "register"
                  ? "Create account"
                  : mode === "recover"
                    ? "Recover account"
                    : "Log in"}
            </Button>
          </Stack>

          {mode === "login" && canPasskey && (
            <>
              <Divider sx={{ my: 2 }}>or</Divider>
              <Button
                fullWidth
                variant="outlined"
                disabled={busy || !username}
                onClick={() => void passkey()}
                data-cy="passkey-login"
              >
                Sign in with a passkey
              </Button>
            </>
          )}

          <Box sx={{ mt: 2, textAlign: "center" }}>
            {mode === "login" ? (
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => {
                  setMode("recover");
                  setError(null);
                }}
                data-cy="forgot-password"
              >
                Forgot password?
              </Link>
            ) : mode === "recover" ? (
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                data-cy="back-to-login"
              >
                Back to log in
              </Link>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
