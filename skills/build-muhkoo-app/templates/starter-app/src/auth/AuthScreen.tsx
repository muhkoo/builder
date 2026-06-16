/**
 * Sign-in screen — a single "Continue with Muhkoo" button that redirects to the
 * Muhkoo-hosted sign-in page (auth.muhkoo.dev). The hosted page handles
 * register / sign-in / recovery and every factor; your app embeds no login UI.
 * Restyle the card to match your app; keep the button wired to `signIn()`.
 */
import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import { APP_NAME } from "../appConfig";

export function AuthScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await signIn(); // redirects away; nothing renders after
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            One Muhkoo identity works across every Muhkoo app. Sign in or create an account —
            zero-knowledge, your password never leaves your device.
          </Typography>
          <Stack spacing={2}>
            {error && <Alert severity="error" data-cy="auth-error">{error}</Alert>}
            <Button variant="contained" size="large" disabled={busy} onClick={go} data-cy="auth-submit">
              {busy ? "Redirecting…" : "Continue with Muhkoo"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
