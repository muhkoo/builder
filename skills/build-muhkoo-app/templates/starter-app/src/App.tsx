import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { RecordsBoard } from "./features/RecordsBoard";
import { ChannelChat } from "./features/ChannelChat";
import { APP_NAME, CHANNEL } from "./appConfig";

function Home() {
  const { username, logout } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <Box data-cy="home">
      {/* `pt: env(safe-area-inset-top)` keeps the bar clear of the status bar /
          notch when installed as a PWA (no-op in a normal browser tab). */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ pt: "env(safe-area-inset-top)" }}>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600, minWidth: 0 }}>
            {APP_NAME}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            data-cy="current-user"
            sx={{ maxWidth: { xs: 90, sm: 200 }, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {username}
          </Typography>
          <Button size="small" onClick={() => void logout()} data-cy="logout" sx={{ flexShrink: 0 }}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {CHANNEL ? (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Records" data-cy="tab-records" />
              <Tab label="Channel" data-cy="tab-channel" />
            </Tabs>
            {tab === 0 ? <RecordsBoard /> : <ChannelChat />}
          </>
        ) : (
          <RecordsBoard />
        )}
      </Container>
    </Box>
  );
}

function Gate() {
  const { username, ready } = useAuth();
  if (!ready) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  return username ? <Home /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
