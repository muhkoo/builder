/**
 * Realtime end-to-end-encrypted channel (see CHANNEL in ../appConfig.ts). Joins
 * the named channel (creating it the first time), replays history, and streams
 * live messages. Messages are sealed with a shared group key the server can't read.
 *
 * Creating the channel is a write that adds data, so in a paid-only app (or one
 * whose owner's payment is past due) it can be refused with
 * `PaymentRequiredError`; `describeError` turns that into an upgrade notice.
 */
import { useEffect, useRef, useState } from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { getClient } from "../lib/client";
import { describeError, type Notice } from "../lib/paymentErrors";
import { CHANNEL } from "../appConfig";
import { NoticeAlert } from "./NoticeAlert";

interface ChatLine {
  key: string;
  from: string;
  text: string;
}

/** Pull the text out of a sealed message body ({ contents } by convention). */
function textOf(body: unknown): string {
  if (body && typeof body === "object" && "contents" in body) {
    const c = (body as { contents?: unknown }).contents;
    return typeof c === "string" ? c : JSON.stringify(c);
  }
  return typeof body === "string" ? body : JSON.stringify(body);
}

export function ChannelChat() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("connecting…");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const spaceRef = useRef<Awaited<ReturnType<ReturnType<typeof getClient>["space"]["joinChannel"]>> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CHANNEL) return;
    let disposed = false;
    let unsub: (() => void) | undefined;

    (async () => {
      setStatus("connecting…");
      const client = getClient();
      let space;
      try {
        space = await client.space.joinChannel(CHANNEL);
      } catch {
        // Channel doesn't exist yet — create it (first run).
        space = await client.space.createChannel(CHANNEL);
      }
      if (disposed) return;
      spaceRef.current = space;

      // Subscribe before keying so we never miss a message.
      unsub = space.onMessage((e) => {
        if (disposed) return;
        setLines((prev) => {
          const key = String(e.handle);
          if (prev.some((l) => l.key === key)) return prev;
          return [...prev, { key, from: e.from, text: textOf(e.message.body) }];
        });
      });

      // A channel is end-to-end encrypted: we can only send/read once we hold the
      // group key. `joinChannel` requests it; poll until it arrives.
      setStatus("securing channel…");
      const keyring = space.keyring;
      const deadline = Date.now() + 25_000;
      while (!disposed && keyring && !keyring.hasAnyKey() && Date.now() < deadline) {
        try { await keyring.pullKeys(); } catch { /* keep waiting */ }
        if (keyring.hasAnyKey()) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (disposed) return;
      if (keyring && !keyring.hasAnyKey()) {
        setStatus("could not obtain channel key");
        return;
      }
      setReady(true);
      setStatus("connected");

      try {
        const { messages } = await space.history({ limit: 100 });
        if (!disposed) {
          setLines((prev) => {
            const seen = new Set(prev.map((l) => l.key));
            const hist = messages
              .filter((e) => !seen.has(String(e.handle)))
              .map((e) => ({ key: String(e.handle), from: e.from, text: textOf(e.message.body) }));
            return [...hist, ...prev];
          });
        }
      } catch {
        // no history / ephemeral channel
      }
    })().catch((err) => {
      if (disposed) return;
      setStatus("could not open channel");
      setNotice(describeError(err));
    });

    return () => {
      disposed = true;
      unsub?.();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  async function send() {
    const space = spaceRef.current;
    const body = text.trim();
    if (!space || !body || !ready) return;
    setText("");
    setNotice(null);
    try {
      await space.sendMessage({ contents: body }, { channel: CHANNEL ?? undefined });
    } catch (err) {
      // Sends go over the channel's live socket. A payment refusal there is NOT
      // surfaced as PaymentRequiredError (connect 0.15.0-alpha.5), so this is
      // usually a plain send failure; the app-shell banner (client.app.access())
      // is what tells the user their writes are blocked.
      setNotice(describeError(err));
      setText(body);
    }
  }

  if (!CHANNEL) return null;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: { xs: "62dvh", sm: 480 } }}
      data-cy="channel"
    >
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        #{CHANNEL}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }} data-cy="channel-status">
        {status}
      </Typography>
      {notice && (
        <Box sx={{ mb: 1 }}>
          <NoticeAlert notice={notice} onClose={() => setNotice(null)} data-cy="channel-error" />
        </Box>
      )}
      <Paper variant="outlined" sx={{ flex: 1, overflowY: "auto", p: 1.5, mb: 1.5 }}>
        <Stack spacing={1}>
          {lines.map((l) => (
            <Box key={l.key} data-cy="chat-message">
              <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                {l.from}
              </Typography>
              <Typography variant="body2">{l.text}</Typography>
            </Box>
          ))}
          <div ref={bottomRef} />
        </Stack>
      </Paper>
      <Stack
        direction="row"
        spacing={1}
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <TextField
          size="small"
          fullWidth
          disabled={!ready}
          placeholder={ready ? `Message #${CHANNEL}` : "securing channel…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          inputProps={{ "data-cy": "chat-input" }}
        />
        <Button type="submit" variant="contained" disabled={!ready || !text.trim()} data-cy="chat-send">
          Send
        </Button>
      </Stack>
    </Box>
  );
}
