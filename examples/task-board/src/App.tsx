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
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: "primary.main", color: "#06140b", borderBottom: "2px solid #181510", pt: "env(safe-area-inset-top)" }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 1.5 }}>
            <Typography
              variant="h5"
              noWrap
              sx={{ fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {APP_NAME}
            </Typography>
            <Box
              component="span"
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                border: "2px solid #06140b",
                px: 0.75,
                py: 0.25,
                display: { xs: "none", sm: "inline-block" },
              }}
            >
              on Muhkoo
            </Box>
          </Box>
          <Box
            data-cy="current-user"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: 13,
              bgcolor: "#06140b",
              color: "primary.main",
              px: 1, py: 0.5,
              maxWidth: { xs: 84, sm: 220 },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {username}
          </Box>
          <Button
            size="small"
            onClick={() => void logout()}
            data-cy="logout"
            sx={{ bgcolor: "#fbf6ec", color: "#181510", flexShrink: 0 }}
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {CHANNEL ? (
          <Box className="bd-rise bd-rise-1">
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                mb: 3,
                minHeight: 0,
                "& .MuiTabs-indicator": { height: 3, bgcolor: "secondary.main" },
              }}
            >
              <Tab label="Tasks" data-cy="tab-records" />
              <Tab label="Channel" data-cy="tab-channel" />
            </Tabs>
            {tab === 0 ? <RecordsBoard /> : <ChannelChat />}
          </Box>
        ) : (
          <Box className="bd-rise bd-rise-1">
            <RecordsBoard />
          </Box>
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
