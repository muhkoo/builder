# Scaffold: `client.db` — the scalable database

**Use when** the app has persistent records (lists, tracked items, history). Best real
sources: **discord-clone** (`lib/db.ts` — servers/channels/memberships/invites/DMs) and
**standup**. Tables are declared at provision time (see provisioning.md); the client
reads/writes rows through the app-keyed data plane.

## The pattern — a typed helper layer over `client.db.table()`

Wrap tables in one module with typed row interfaces + async CRUD. The UI calls these and
refreshes lists after writes.

```ts
// src/lib/db.ts
import { getClient } from "./client";
const t = (name: string) => getClient().db.table(name);

export interface TaskRow {
  _id: number;            // server-assigned primary key (use for get/update/delete)
  title: string;
  done: boolean;
  owner: string;          // the creator's commitment — the row-scoping key
  created_at: number;     // ms epoch (Date.now()); be consistent across the table
}

export async function addTask(title: string): Promise<TaskRow> {
  const { row } = await t("tasks").insert({ title, done: false, owner: myCommitment(), created_at: Date.now() });
  return row as unknown as TaskRow;
}

export async function myTasks(): Promise<TaskRow[]> {
  const { rows } = await t("tasks").query({
    where: [{ column: "owner", op: "eq", value: myCommitment() }], // ALWAYS scope by owner
    orderBy: { column: "created_at", dir: "desc" },
    limit: 100,                                                    // clamped to 100 server-side
  });
  return rows as unknown as TaskRow[];
}

export const setDone   = (id: number, done: boolean) => t("tasks").update(id, { done });
export const removeTask = (id: number) => t("tasks").delete(id);
```

Query operators: `eq neq gt gte lt lte in like likeStartsWith likeContains`. Multiple
`where` entries are AND-combined. Paginate with the returned `nextCursor`:

```ts
const { rows, nextCursor } = await t("tasks").query({ limit: 50, cursor });
```

UI refresh (no magic — re-query after a write):
```tsx
const [tasks, setTasks] = useState<TaskRow[]>([]);
const refresh = useCallback(() => db.myTasks().then(setTasks), []);
useEffect(() => { void refresh(); }, [refresh]);
async function add() { await db.addTask(text); await refresh(); }
```

## Row conventions

- **`_id`** — server-assigned primary key (when you don't declare your own). Use it for
  `get`/`update`/`delete`.
- **`created_at`** — add it yourself for ordering; **pick one format and stick to it**
  (discord-clone uses `Date.now()` ms; standup used `new Date().toISOString()`). The
  `timestamp` column type stores either.
- **`owner`** — the user's `commitment` (from auth). The data plane is keyed by the **app**,
  not per-user, so row-level access is **app-enforced**: scope every read/write by `owner`.

## Gotchas

1. **Scope by `owner` or you leak rows.** Forgetting `where: [{ column: "owner", … }]`
   exposes every user's rows — the data plane won't stop you. This is the #1 mistake.
2. **No JOINs.** Load related rows sequentially (N+1). Fine for small lists (<100); for
   bigger relations, denormalize or page.
3. **`limit` is clamped to 100.** Use `nextCursor` for more; don't expect a giant page.
4. **Additive schema only.** Add columns/indexes via PUT; destructive changes 409 — drop +
   recreate or add a new column (provisioning.md).

## See it in
`discord-clone/src/lib/db.ts` (the typed-helper layer + real filters/ordering/updates),
`standup/src/features/RecordsBoard.tsx`, `task-board/src/features/RecordsBoard.tsx`.
