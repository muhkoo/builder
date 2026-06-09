# Scaffold: PWA + safe areas

**Use when** the app should be **installable** and run **standalone** on a phone (an
"Add to Home Screen" app) — not just a browser tab.

Makes the app a Progressive Web App (web manifest + service worker + install meta) and
— the part that bites people — makes the layout respect the device **safe areas** so
content doesn't sit under the status bar / notch (top) or the home indicator (bottom)
when running standalone.

> The baseline template already sets `viewport-fit=cover` and adds
> `pt: env(safe-area-inset-top)` to the app bar, so a top overlap is handled out of the
> box. This scaffold adds the rest of the PWA (manifest, SW, install) and the remaining
> safe-area insets (bottom-fixed bars, landscape side notches).

## What it adds

### 1. Service worker + manifest (`vite-plugin-pwa`)

```bash
npm install -D vite-plugin-pwa
```

In `vite.config.ts`, add the plugin (mirrors the production `muhkoo/web` setup — note the
two ZK-specific cautions):

```ts
import { VitePWA } from "vite-plugin-pwa";

// …inside plugins: [ react(), wasm(), topLevelAwait(), nodePolyfills({…}),
  VitePWA({
    // Ship a new SW + bundle on every deploy (no "click to refresh" prompt) — right
    // for an app where a stale bundle could cause decrypt mismatches.
    registerType: "autoUpdate",
    includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png"],
    manifest: {
      name: "{{APP_NAME}}",
      short_name: "{{APP_NAME}}",
      description: "A Muhkoo app.",
      theme_color: "#58da7d",       // matches index.html <meta theme-color>
      background_color: "#0a1929",  // splash background
      display: "standalone",
      start_url: "/",
      scope: "/",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      // The bundle inlines snarkjs + circomlibjs (~5 MB). Workbox refuses >2 MB by
      // default — bump so the main chunk precaches. (Code-split later to slim this.)
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      // Never precache the on-demand ZK circuit binaries.
      globIgnores: ["**/circuits/**"],
      navigateFallback: "/index.html",
      navigateFallbackDenylist: [/^\/api\//, /^\/circuits\//],
    },
    // Do NOT register the SW in dev — a dev SW caches the @muhkoo/connect bundle and
    // masks local changes (serving a stale build missing newer exports).
    devOptions: { enabled: false, type: "module" },
  }),
```

### 2. Install meta (`index.html`)

Keep `viewport-fit=cover` (already there) and add the standalone hints:

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<!-- `default` keeps a normal status bar; use `black-translucent` to draw under it
     (then the safe-area insets below are what keep content clear). -->
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="{{APP_NAME}}" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 3. Safe areas — keep content off the phone UI

The CSS `env(safe-area-inset-{top,right,bottom,left})` values are **0 in a browser tab**
and non-zero only in standalone/cover mode, so applying them is harmless everywhere.
Apply them to the shell edges (this app uses MUI `sx`):

- **Top bar** (already in the baseline): `sx={{ pt: "env(safe-area-inset-top)" }}` on the
  `AppBar` — its background fills the notch, the toolbar sits below it.
- **Anything fixed to the viewport bottom** (a bottom nav, a docked composer):
  `sx={{ pb: "env(safe-area-inset-bottom)" }}` so it clears the home indicator.
- **Landscape side notches**: pad the page container horizontally —
  `sx={{ pl: "max(16px, env(safe-area-inset-left))", pr: "max(16px, env(safe-area-inset-right))" }}`.

Prefer the `max(<base>, env(...))` form so your normal padding is the floor and the inset
only ever *adds* room.

### 4. Icons

PWAs need real icons. Add `public/icons/icon-192.png` + `icon-512.png` (and an
`apple-touch-icon.png`) — generate from the app's logo, or use the Muhkoo mark from the
brand assets. Without them the install prompt won't show a proper icon.

## Contract

- Keep every `data-cy` hook and the `@muhkoo/connect` wiring (this is layout/meta only).
- Stay **responsive** — safe-area insets complement the responsive rules, they don't
  replace them.

## Verify

- `npm run build` typechecks + builds (the SW + manifest are emitted into `dist/`).
- DevTools → Application → Manifest shows the manifest + icons; "Installable" with no
  errors. Install it (or use device emulation with a notch) and confirm the app bar sits
  **below** the status bar and nothing is clipped by the home indicator.
- `npm run test:e2e` still green (incl. `04-responsive`).
