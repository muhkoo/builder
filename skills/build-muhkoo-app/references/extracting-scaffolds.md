# Extracting a scaffold from the rework

A build session is a one-way function in the wrong direction: a plain-language
**prompt** goes in, and the skill *reworks* it into a real app — a provision spec
(`app.json`), a feature-coded client, and a green test suite. That rework is where the
hard-won knowledge lives (the keyring handshake you got right, the `owner`-scoping rule,
the gotcha that cost an hour). **Extracting a scaffold** runs that function backwards:
distill the rework back into a reusable blueprint so the *next* build starts ahead.

Do this whenever a build produced something worth not re-deriving — a non-obvious
pattern, a new capability, or a clean data-model shape.

## The two artifacts

Extraction captures two things, and the script writes both:

1. **The scaffold** (`scaffolds/<name>.md`) — the *applied* pattern, in the canonical
   shape (when-to-use → pattern → gotchas → contract → see-it-in). This is the same kind
   of file as [api-db.md](../scaffolds/api-db.md) or [pwa.md](../scaffolds/pwa.md).
2. **The captured rework** (`scaffolds/seeds/<name>.spec.json`) — a *genericized* copy of
   the reworked `app.json`: the tables/channels/agents/functions shapes the design landed
   on, with keys, ids, secrets, and origins stripped. It's a **seed** — a starting spec a
   future build can copy instead of designing from zero.

The scaffold says *how to build it*; the seed says *what the reworked design looked like*.

## Procedure

1. **Finish and verify the build first.** Only extract from a green app — the test suite
   is your proof the pattern actually works. A scaffold distilled from broken wiring
   propagates the breakage.

2. **Generate the skeletons + capture the rework** with the helper. Run it from anywhere
   (it resolves the skill dir from its own location):

   ```bash
   node <skill-dir>/scripts/extract-scaffold.mjs \
     --name <kebab> --kind api|capability \
     [--title "Human title"] [--surface client.x] \
     --from <built-app-dir>      # reads its app.json → seeds/<name>.spec.json
   ```

   - `--kind api` for a `@muhkoo/connect` surface pattern; `--kind capability` for an
     opt-in add-on (dark-mode, infinite-scroll, push). Default `capability`.
   - `--from` is what captures the rework — point it at the built app dir (or a spec
     path). Omit it if there's no spec worth seeding (a pure-UI capability).
   - The script **never overwrites** an existing scaffold or seed.

3. **Fill in `scaffolds/<name>.md` from the real code.** The skeleton has TODOs — replace
   them with the *actual* snippet you wrote (trimmed to the essence), the gotchas that
   bit you, and a `See it in` pointer to the source file. Don't paraphrase from memory;
   copy the working code and cut it down.

4. **Add a row** to [scaffolds/README.md](../scaffolds/README.md) under the right table
   (API or Capability) with a tight "Use when".

5. **Keep the contract.** Every scaffold ends with the preservation contract (`data-cy`
   hooks, untouched SDK calls, `ready` gating, responsiveness) — see
   [design.md](./design.md). Re-running `npm run test:e2e` after *applying* a scaffold is
   the bar; a scaffold must never break the suite.

## What makes a good extraction

- **One concern.** A scaffold is opt-in and focused — if it touches everything, it's not
  a scaffold, it's a template change.
- **Applied, not abstract.** The value over [platform.md](./platform.md) is the *real*
  code + the gotcha, not the signature.
- **Genericized.** Strip the app's name, ids, and copy from both the scaffold and the
  seed — the next app isn't this app.

## See it in
The existing [scaffolds/](../scaffolds/README.md) were all extracted this way from
`web` chat, `discord-clone`, `standup`, and the `task-board` example.
