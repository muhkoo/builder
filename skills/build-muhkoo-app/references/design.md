# Design pass — making the app distinctive

The scaffolded app works, but it looks like a default MUI app. Before you call it
done, give it a **distinctive, production-grade look** with the **`frontend-design`**
skill. That skill's whole job is to avoid generic "AI slop" aesthetics — commit to a
bold, cohesive aesthetic direction (typography, color, motion, composition,
atmosphere) appropriate to *this* app.

The catch: the app is wired to a real backend and covered by a Cypress suite. The
design pass changes how it **looks**, never how it **works**. That's a hard contract.

## When to do it

After the app is scaffolded and functional (step 4), before/at verification (step 6).
Design every app — vary the aesthetic per app's purpose; never converge on one look.

## How

Invoke the `frontend-design` skill with the app's **purpose + audience** and the
**files to restyle**, and hand it this contract. It owns the visual layer; you keep
the wiring intact. Then re-run `npm run test:e2e` — green is the gate.

## The preservation contract (load-bearing — do not break)

1. **Keep every `data-cy` attribute.** The Cypress suite selects on them
   (`auth-screen`, `auth-submit`, `current-user`, `tab-records`, `tab-channel`,
   `record-input-*`, `record-add`, `record-row`, `record-toggle`, `record-delete`,
   `channel-status`, `chat-input`, `chat-send`, `chat-message`, `home`, `logout`).
   Move them onto whatever new elements you build, but never drop or rename them.
2. **Keep the SDK wiring.** The `@muhkoo/connect` calls and the hooks/handlers in
   `AuthContext`, `RecordsBoard`, `ChannelChat` (`client.auth.zk`, `client.db`,
   `client.space`, the keyring `ready` gate) are the app's logic — restyle the markup
   around them, don't change what they call or when.
3. **Keep it driven by `src/appConfig.ts`.** Fields/table/channel still come from
   config so the app stays data-model-agnostic.
4. **Keep inputs real form controls** with their `autocomplete` attrs (`username`,
   `new-password`, `current-password`) — the auth spec types into them.
5. **Accessibility = testability.** Buttons stay `<button>`, the channel status text
   still contains the word `connected` when ready, the composer stays disabled until
   `ready`. Cypress asserts on these.
6. **Responsive — every app works on a phone.** This is non-negotiable. The design
   must be usable and look intentional from **~360px wide up to desktop**:
   - No horizontal scroll at any width. Nothing clipped off-screen.
   - The app bar / header collapses gracefully (hide or shrink secondary chips; long
     usernames truncate, never push the layout wide). Use `display: { xs, sm }`,
     `flexWrap`, `minWidth: 0` + `text-overflow: ellipsis`.
   - Stacked-on-mobile, side-by-side-on-wider forms/toolbars (`direction={{ xs:
     "column", sm: "row" }}`). Tap targets ≥ 40px.
   - Scrollable panels (chat) use viewport-relative or flexible heights, not a fixed
     px height that overflows a short screen.
   - The `<meta name="viewport" …>` tag stays in `index.html`.
   The mobile-viewport Cypress spec (`cypress/e2e/04-responsive.cy.ts`) is the gate —
   it loads at 375×812 and asserts no horizontal overflow + that the core controls are
   visible and usable. Keep it green.

## What the design pass is free to change

Everything visual: the theme, fonts (drop generic Inter/Roboto for something with
character), colors, backgrounds/atmosphere (gradient meshes, noise, texture, grain),
layout/composition, motion (staggered page-load reveals, hover states,
micro-interactions), and component shells. It may deeply re-theme MUI **or** replace
the presentational components with bespoke ones — as long as the contract holds.

## Muhkoo brand (a base, not a requirement)

A starting palette if it fits the app: green `#58da7d`, slate `#0a1929`, with
JetBrains Mono for monospace. But the `frontend-design` skill should feel free to
choose a direction that's true to the app's purpose rather than defaulting to brand.

## Motion gotcha (learned the hard way)

Never gate content **visibility** on a load animation. A reveal that starts at
`opacity: 0` and depends on the animation finishing to become visible will leave the
page blank if the animation doesn't run (reduced-motion, headless capture, a paint
hiccup). Make the resting state visible and let motion be additive: use
`animation-fill-mode: backwards` (the from-state applies only during the delay) rather
than `forwards` with an `opacity: 0` base. Cypress won't catch this — it doesn't treat
`opacity: 0` as invisible — so eyeball a screenshot too.

## After the pass

- `npm run build` typechecks + builds clean.
- `npm run test:e2e` — all specs green. **If a spec fails, the design pass dropped a
  `data-cy` hook or changed a control's semantics — fix the markup, not the test.**
- Eyeball it (a screenshot or the dev server) — tests prove behavior, not looks.
