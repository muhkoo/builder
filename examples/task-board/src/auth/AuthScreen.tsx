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
    <Box
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}
      data-cy="auth-screen"
    >
      <Card className="bd-rise bd-rise-1" sx={{ width: "100%", maxWidth: 400, position: "relative", overflow: "visible" }}>
        {/* Loud corner tab — a brutalist signature. */}
        <Box
          sx={{
            position: "absolute",
            top: -2,
            right: 24,
            transform: "translateY(-100%)",
            bgcolor: "primary.main",
            color: "#06140b",
            border: "2px solid #181510",
            borderBottom: "none",
            px: 1.25,
            py: 0.5,
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Muhkoo · ZK
        </Box>
        <CardContent sx={{ p: 3.5 }}>
          <Typography className="bd-eyebrow" component="div" sx={{ mb: 1 }}>
            Sign in to
          </Typography>
          <Typography variant="h4" sx={{ mb: 1, lineHeight: 1 }}>
            {APP_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Zero-knowledge sign-in — your password never leaves this device.
          </Typography>
          <Tabs
            value={mode}
            onChange={(_, v) => setMode(v)}
            sx={{
              mb: 2.5,
              minHeight: 0,
              "& .MuiTabs-indicator": { height: 3, bgcolor: "secondary.main" },
            }}
          >
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
              size="large"
              fullWidth
              disabled={busy || !username || !password}
              data-cy="auth-submit"
              sx={{ mt: 0.5, py: 1.25, fontFamily: '"Bricolage Grotesque", sans-serif', fontSize: 16 }}
            >
              {busy ? "Working…" : mode === "register" ? "Create account →" : "Log in →"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
