# Scaffold: `PaymentRequiredError` + `client.app.access()` — paid-only apps and past-due accounts

**Use when** the app has signed-in users who write data — i.e. almost always. The
starter template already ships this pattern; follow it for every write you add.

Two platform rules can refuse a user's writes that **add data** (reads, sign-in and
deletes keep working):

- the app's owner switched on **"Paid Muhkoo accounts only"** (portal → the app →
  **Deploy** tab; an owner-only toggle, not a provision-spec field), and the user is
  on Free;
- a payment is **past due** — the user's own, or the app owner's (then the app stores
  nothing new for anyone, on any tier).

`@muhkoo/connect` (0.15.0-alpha.5+) throws **`PaymentRequiredError`** for these, with
`err.code` and `err.upgradeUrl`, and offers **`client.app.access()`** to ask up front.

## The pattern

**1 — One mapping helper** (`src/lib/paymentErrors.ts`), used by every feature:

```ts
import { PaymentRequiredError, type PaymentRequiredCode } from "@muhkoo/connect";

export interface Notice { message: string; actionUrl?: string; actionLabel?: string }

export function paymentNotice(code: PaymentRequiredCode | undefined, upgradeUrl?: string): Notice {
  const url = upgradeUrl && /^https?:\/\//i.test(upgradeUrl) ? upgradeUrl : undefined;
  switch (code) {
    case "user_payment_past_due":
      return { message: "Your Muhkoo payment is past due — update your payment method.",
               ...(url ? { actionUrl: url, actionLabel: "Update payment" } : {}) };
    case "owner_payment_past_due":
      return { message: "This app can't save changes right now." }; // nothing the user can do
    default: // "user_plan_required"
      return { message: "This app needs a paid Muhkoo plan.",
               ...(url ? { actionUrl: url, actionLabel: "Upgrade" } : {}) };
  }
}

export function describeError(err: unknown): Notice {
  if (err instanceof PaymentRequiredError) return paymentNotice(err.code, err.upgradeUrl);
  return { message: err instanceof Error ? err.message : String(err) };
}
```

**2 — Wrap every write** and render the notice (`NoticeAlert` shows the message and,
when there is one, an **Upgrade** / **Update payment** button linking to `actionUrl`):

```tsx
const [error, setError] = useState<Notice | null>(null);

async function toggle(row: Row) {
  setError(null);
  try {
    await table.update(row._id, { done: !row.done });
    await refresh();
  } catch (e) {
    setError(describeError(e));
  }
}
// …
{error && <NoticeAlert notice={error} onClose={() => setError(null)} />}
```

**3 — Ask up front, after sign-in and on return to the tab** (`AuthContext`), and show
a banner in the app shell:

```ts
async function checkAccess(): Promise<AppAccess | null> {
  try {
    const access = await getClient().app.access(); // { paidAccountsOnly, allowed, reason?, upgradeUrl? }
    return access.allowed ? null : access;
  } catch {
    return null; // 404 from an older server, or offline: fail open — the server enforces it anyway
  }
}

useEffect(() => {
  if (!username) return setAccess(null);
  let cancelled = false;
  const check = () => void checkAccess().then((a) => { if (!cancelled) setAccess(a); });
  const onVisible = () => { if (document.visibilityState === "visible") check(); };
  check();
  document.addEventListener("visibilitychange", onVisible); // back from the upgrade page
  return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
}, [username]);

// App shell:
{access && <NoticeAlert severity="warning" notice={paymentNotice(access.reason, access.upgradeUrl)} />}
```

## Gotchas

1. **Not every 402 is this.** A Free-tier quota refusal or an agent/function create on a
   free developer account is a plain `HttpError` 402 with no `code`. Only the three codes
   (`user_plan_required`, `user_payment_past_due`, `owner_payment_past_due`) become
   `PaymentRequiredError`. `user_payment_past_due` is told to first-party apps only;
   your app gets `user_plan_required` for a past-due user.
2. **Live-socket sends aren't surfaced.** `space.sendMessage` goes over the channel's
   socket, and a refusal there does not throw `PaymentRequiredError` (under an owner
   past-due block a queued message is lost). The `access()` banner is how the user finds
   out. Creating a channel *is* covered (`createChannel` → `createSpace`).
3. **`client.functions.invoke` returns the raw `Response`** — check `res.status === 402`
   and read the body's `code` yourself.
4. **Only link absolute http(s) URLs.** The SDK already drops anything else from
   `upgradeUrl`; the helper checks again so a link can go straight into `href`.
5. **`access()` can lag a payment by about a minute** — it may say `allowed` while
   writes are still refused. The `visibilitychange` re-check covers the usual "back from
   the portal" path; a refused write still shows its own notice.
6. **Offline writes are kept, not lost.** A queued write refused for payment stays in
   the queue (with everything after it) and `EventCore` emits `SYNC_ERROR` with
   `{ code, dropped: false }`. Show "unsaved changes" from
   `client.offline.queue.waiting()` (not `pending()`, which counts other users' writes).
   Each `allowed` answer from `access()` resends them (`client.offline.resume()`).
7. **Never call `client.app.access()` from a `SYNC_COMPLETE` handler.** The sync still
   completes while writes wait, and each `allowed` answer starts another sync — the two
   would call each other in a loop.

## Contract — what must stay intact

- Every write handler catches and routes through `describeError` — no bare `await` on a
  write in an event handler.
- The `access()` check fails open (any error → allowed) and never runs from
  `SYNC_COMPLETE`.
- The owner-past-due notice offers no action; the other two link only to an http(s)
  `upgradeUrl`.
- Every `data-cy` hook stays; the result stays responsive.

## See it in
`templates/starter-app/src/lib/paymentErrors.ts`, `src/features/NoticeAlert.tsx`,
`src/features/RecordsBoard.tsx`, `src/features/ChannelChat.tsx`,
`src/auth/AuthContext.tsx` (`checkAccess`), `src/App.tsx` (the `access-banner`).
