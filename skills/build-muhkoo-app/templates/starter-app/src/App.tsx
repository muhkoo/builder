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
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {APP_NAME}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }} data-cy="current-user">
            {username}
          </Typography>
          <Button size="small" onClick={() => void logout()} data-cy="logout">
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
