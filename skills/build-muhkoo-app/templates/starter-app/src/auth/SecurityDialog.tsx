/** Signed-in account-recovery surface: add a passkey, generate a one-time
 *  recovery phrase, change password, and view/remove factors. Accounts are
 *  un-lose-able once a user sets up either a passkey or a recovery phrase. */
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "./AuthContext";

type Factor = Awaited<ReturnType<ReturnType<typeof useAuth>["listFactors"]>>[number];

export function SecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canPasskey, enrollPasskey, enrollRecoveryPhrase, changePassword, listFactors, removeFactor } = useAuth();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [phrase, setPhrase] = useState<string | null>(null); // shown ONCE
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    try {
      setFactors(await listFactors());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (open) {
      setPhrase(null);
      setNotice(null);
      setError(null);
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (ok) setNotice(ok);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" data-cy="security-dialog">
      <DialogTitle>Account &amp; recovery</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error" data-cy="security-error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}

          {phrase && (
            <Alert severity="warning" data-cy="recovery-phrase-output">
              <Typography variant="body2" sx={{ mb: 1 }}>
                Save these 24 words somewhere safe. They are shown only once and let you recover
                this account if you forget your password.
              </Typography>
              <Box sx={{ fontFamily: "monospace", wordSpacing: 4, userSelect: "all" }}>{phrase}</Box>
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Recovery
            </Typography>
            <Stack spacing={1}>
              {canPasskey && (
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void run(() => enrollPasskey(), "Passkey added.")}
                  data-cy="enroll-passkey"
                >
                  Add a passkey
                </Button>
              )}
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => void run(async () => setPhrase(await enrollRecoveryPhrase()))}
                data-cy="enroll-phrase"
              >
                Generate a recovery phrase
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await changePassword(newPassword);
                setNewPassword("");
              }, "Password changed.");
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Change password
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                type="password"
                label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                data-cy="new-password"
              />
              <Button type="submit" variant="contained" disabled={busy || !newPassword} data-cy="change-password">
                Save
              </Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Sign-in factors
            </Typography>
            <List dense data-cy="factor-list">
              {factors.map((f) => (
                <ListItem
                  key={f.id}
                  secondaryAction={
                    factors.length > 1 ? (
                      <IconButton
                        edge="end"
                        size="small"
                        disabled={busy}
                        onClick={() => void run(() => removeFactor(f.id), "Factor removed.")}
                        data-cy="remove-factor"
                        aria-label="Remove factor"
                      >
                        ✕
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemText primary={f.label || f.type} />
                  <Chip size="small" label={f.type} sx={{ mr: 1 }} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
