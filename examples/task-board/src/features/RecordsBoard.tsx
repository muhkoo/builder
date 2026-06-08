/**
 * Generic CRUD over the configured database table (see ../appConfig.ts). Reads
 * `client.db.table(TABLE.name)` and renders a list + add form. Adjust the fields
 * in appConfig.ts to match your provisioned table.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getClient } from "../lib/client";
import { TABLE, type AppField } from "../appConfig";

type Row = Record<string, unknown> & { _id?: string | number };

function emptyDraft(): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const f of TABLE.fields) d[f.name] = f.type === "boolean" ? false : "";
  return d;
}

export function RecordsBoard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const table = getClient().db.table<Row>(TABLE.name);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await table.query({ limit: 100 });
      setRows(res.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add() {
    setError(null);
    try {
      const values: Record<string, unknown> = { ...draft };
      // Stamp a created_at if the table has one (ignored if not a column).
      values.created_at = new Date().toISOString();
      await table.insert(values);
      setDraft(emptyDraft());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleBool(row: Row, field: AppField) {
    if (row._id == null) return;
    await table.update(row._id, { [field.name]: !row[field.name] });
    await refresh();
  }

  async function remove(row: Row) {
    if (row._id == null) return;
    await table.delete(row._id);
    await refresh();
  }

  const boolField = TABLE.fields.find((f) => f.type === "boolean");
  const titleField = TABLE.fields.find((f) => f.type === "text") ?? TABLE.fields[0];

  return (
    <Box data-cy="records">
      <Typography className="bd-eyebrow" component="div" sx={{ mb: 0.5 }}>
        {rows.length} {rows.length === 1 ? "item" : "items"} · live
      </Typography>
      <Typography variant="h4" sx={{ mb: 2.5, textTransform: "capitalize" }}>
        {TABLE.name}
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          {TABLE.fields.map((f) =>
            f.type === "boolean" ? (
              <Stack key={f.name} direction="row" alignItems="center">
                <Checkbox
                  checked={Boolean(draft[f.name])}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.checked }))}
                />
                <Typography variant="body2">{f.label}</Typography>
              </Stack>
            ) : (
              <TextField
                key={f.name}
                label={f.label}
                size="small"
                type={f.type === "number" ? "number" : "text"}
                value={String(draft[f.name] ?? "")}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value,
                  }))
                }
                required={f.required}
                fullWidth
                inputProps={{ "data-cy": `record-input-${f.name}` }}
              />
            ),
          )}
          <Button type="submit" variant="contained" data-cy="record-add">
            Add
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <List sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 0 }}>
        {rows.map((row, i) => {
          const done = boolField ? Boolean(row[boolField.name]) : false;
          return (
            <ListItem
              key={String(row._id ?? i)}
              data-cy="record-row"
              disableGutters
              sx={{
                bgcolor: "background.paper",
                border: "2px solid #181510",
                boxShadow: "3px 3px 0 #181510",
                px: 1.5,
                py: 0.5,
                opacity: done ? 0.62 : 1,
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={() => void remove(row)}
                  aria-label="delete"
                  data-cy="record-delete"
                  sx={{ borderRadius: 0, "&:hover": { color: "secondary.main" } }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              }
            >
              {boolField && (
                <Checkbox
                  edge="start"
                  checked={done}
                  onChange={() => void toggleBool(row, boolField)}
                  data-cy="record-toggle"
                />
              )}
              <ListItemText
                primary={String(row[titleField.name] ?? "(untitled)")}
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 500,
                    fontSize: 17,
                    textDecoration: done ? "line-through" : "none",
                    textDecorationThickness: "2px",
                  },
                }}
              />
            </ListItem>
          );
        })}
        {!loading && rows.length === 0 && (
          <Box
            sx={{
              border: "2px dashed #b8ad93",
              p: 3,
              textAlign: "center",
              color: "text.secondary",
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 13,
            }}
          >
            No tasks yet — add one above.
          </Box>
        )}
      </List>
    </Box>
  );
}
