/** Register / login screen using Muhkoo ZK auth. */
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "./AuthContext";
import { APP_NAME } from "../appConfig";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await register(username, password, email || undefined);
      else await login(username, password);
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
          <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
            <Tab value="login" label="Log in" data-cy="tab-login" />
            <Tab value="register" label="Register" data-cy="tab-register" />
          </Tabs>
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
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
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
            {error && <Alert severity="error" data-cy="auth-error">{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !username || !password}
              data-cy="auth-submit"
            >
              {busy ? "…" : mode === "register" ? "Create account" : "Log in"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
