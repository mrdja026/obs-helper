# Spotify integration – web-first notes and follow‑ups

This summarizes what’s implemented, how the HTTPS + PKCE S256 flow works for web, and what to check next when tracks don’t play after “connected”.

## Implemented

- Backend (proxy)

  - POST /api/spotify/auth/exchange: PKCE code exchange; accepts `{ code, codeVerifier, redirectUri }`, validates `redirectUri`, stores tokens to `spotify-tokens.json`.
  - POST /api/spotify/queue: enqueue matched track URI on active Spotify device.
  - songQueue: items augmented with `matchStatus` (`pending | matched | error`) and `spotify` match; async search runs after add; `songQueueUpdated` broadcast via WS.
  - CORS allows `https://127.0.0.1:8443`. `spotify.redirectUriWeb` defaults to `https://127.0.0.1:8443/oauthredirect`.

- Expo app

  - PKCE S256 with `expo-crypto`; verifier stored in both `sessionStorage` and `localStorage` before redirect.
  - Web redirect fixed to `https://127.0.0.1:8443/oauthredirect`.
  - Queue UI shows match state; Play button calls `/api/spotify/queue`.

- HTTPS reverse proxy (obs_helper/obs_helper/dev-http-proxy.js)
  - TLS for `https://127.0.0.1:8443` using mkcert `dev-certs/127.0.0.1(.pem|-key.pem)`.
  - Routes: `/oauthredirect` (handles exchange on same origin), `/api/*` → backend `http://localhost:3001`, everything else → Expo Web `http://localhost:8081`.

## Web flow (local)

1. Dashboard

   - Redirect URIs: `obshelper://oauthredirect` and `https://127.0.0.1:8443/oauthredirect`.
   - Scopes: `user-modify-playback-state`, `user-read-playback-state`.
   - Redirect rules (HTTPS or loopback, exact match): see Spotify docs [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

2. Run

   - Expo Web: `npx expo start --web --port 8081`.
   - Proxy: `node dev-http-proxy.js`.
   - Open: `https://127.0.0.1:8443`.

3. Auth

   - Settings → Connect Spotify → consent → redirected to `/oauthredirect?code=...`.
   - The page posts `{ code, codeVerifier, redirectUri }` to `/api/spotify/auth/exchange` and shows “Spotify connected. You can close this tab.” on success.

4. Queue
   - Add song → item `pending` → `matched` when search succeeds.
   - Press Play (requires an active Spotify device).

## Current issue to investigate

- Symptom: After “connected”, you must relaunch the app and tracks don’t play.

Checks:

1. Tokens file

- Ensure backend `spotify-tokens.json` exists and contains valid `accessToken`, `refreshToken`, non‑expired `expiresAt`.

2. Device

- `/api/spotify/queue` returns 409 `no_active_device` if Spotify isn’t open/active on any device.

3. CORS/origin

- Web app calls backend from `https://127.0.0.1:8443`; this origin is allowed. If changing ports/origins, update CORS.

4. Search

- If queue rows stay `pending`, the search failed. Check backend logs around `spotifyService.searchBestTrack`.

5. Playback state

- If enqueues succeed but nothing plays, check `getPlaybackState` and device list (debug endpoints below).

## Minimal verification

- After auth, confirm `spotify-tokens.json` exists and `expiresAt` in the future.
- Try Play; if 409, open Spotify app on any device and retry.
- If Play 5xx, capture backend logs for `/api/spotify/queue`.

## Proposed follow‑ups

1. Status endpoint

- `GET /api/spotify/status` → `{ authenticated: boolean, hasRefresh: boolean, expiresAt: string | null }`.
- Show in Settings as “Spotify Connected ✓/✗”.

2. Debug endpoint (optional)

- `GET /api/spotify/debug` → latest `getPlaybackState()` (redact tokens); helpful to confirm active device.

3. Better Play UX

- If 409 from `/api/spotify/queue`, surface a toast: “Open Spotify on any device and try again.”

Ping me to implement 1–3; they’re small and will clarify the remaining issue quickly.

# Part 2 – Web proxy + WS and status (what changed, what’s the bug)

What’s implemented now

- HTTPS proxy
  - `/api/*` forwarded to backend `http://127.0.0.1:3001` (configurable via `BACKEND`).
  - Web target `http://localhost:8081` for Expo Web.
  - Added WebSocket upgrade forwarding at `wss://127.0.0.1:8443/ws` → backend WS, so the web app receives live updates.
  - `/oauthredirect` now shows success only if the exchange returns 2xx; on failure it prints the error body.
- Backend
  - `GET /api/spotify/status` returns `{ authenticated, hasRefresh, expiresAt }`.
  - Fixed PKCE exchange: `node-fetch` imported via dynamic `import()` to support ESM.
  - Tokens persist to `spotify-tokens.json` after successful exchange.
- App (web)
  - Main screen shows a green/red Spotify indicator.
  - All API calls use same‑origin (through `https://127.0.0.1:8443`), removing mixed‑content errors.
  - WebSocket connects to `wss://127.0.0.1:8443/ws` for live queue/chat updates.

Verified

- `/api/health` through the proxy returns JSON (no 502).
- Spotify exchange succeeds; `spotify-tokens.json` created; indicator turns green.
- OBS connect via the proxy works; chat and queue updates broadcast over WS (backend logs show messages fanned out to clients).

Known bug (harmless for functionality)

- Expo dev server logs: `Error: Unauthorized request from https://127.0.0.1:8443`.
  - Why: Expo’s dev middleware protects certain dev endpoints and may warn when the app is served via a reverse proxy origin. It can also be triggered by browser extensions intercepting requests.
  - Impact: Only a console/server warning; the app, API, and WS continue to work.
  - Workarounds:
    - Use an incognito window or disable request‑intercepting extensions (as the message suggests).
    - Keep using the current setup; warnings are expected during dev and do not block functionality.
    - Optional: serve Expo Web directly (http://localhost:8081) when debugging dev‑server features; continue using the HTTPS proxy only for the OAuth flow.

Next small follow‑ups

- Add `/api/spotify/debug` (playback/device snapshot) to speed up “no_active_device” diagnosis. [Implemented]
- Show a toast on 409 from `/api/spotify/queue`: “Open Spotify on any device and try again.” [Implemented]
- Optional: refine proxy to suppress dev‑server middleware warnings (not required for functionality).

## Debug endpoint

- `GET /api/spotify/debug` returns:
  - `playback`: `isPlaying`, `progressMs`, `item { name, uri, artists[], durationMs }`, `device { name, id(masked), is_active, type }`
  - `devices[]`: `name`, `id(masked)`, `is_active`, `type`
  - `fetchedAt`: ISO string

Use it during development to confirm whether Spotify has an active device and what is currently playing.

## UX on 409 no_active_device

- When pressing Play from the queue and the backend responds with `409 { error: "no_active_device" }`, the app now surfaces a message: “Open Spotify on any device and try again.” Other 409 cases display contextual messages.

## Progress header and visual hide (client-only)

- The app polls `GET /api/spotify/debug` every 2s to read playback progress.
- A small header row shows the current track title and remaining time (mm:ss).
- When the currently playing track matches the head of the queue and remaining time ≤ ~1.5s, the head item is hidden from the UI. Server queue state is unchanged; WS updates remain source-of-truth.
