# Live Tracking Integration Architecture

## Inspected baseline
Node.js 20+ ESM, Express 4, PostgreSQL (`pg`), PostgreSQL-backed admin sessions, CSRF headers and Origin checks. The frontend is a vanilla-JS SPA in `public/assets/app.js` with orange/charcoal CSS tokens. Public trips require published/public state; private trips require published/private state and a hashed possession token. Stops and itinerary are JSONB, not relational stop tables. Startup executes `db/schema.sql`. Deployment instructions target Debian, Nginx, HTTPS and systemd/PM2; no deployment configuration or Android project exists.

## Integration design
Extend the existing server using a tracking module and additive SQL migration. Do not replace the application, trip data, destination records, auth model or UI framework. New checkpoints reference a trip's JSONB stop index; session creation snapshots only stop identity/order, not a duplicate destination catalog. Reject invalid coordinates instead of guessing them.

Android -> authenticated HTTPS -> existing Express -> PostgreSQL -> authorized SSE/polling -> admin and scoped customer pages. Bearer device tokens are provisioned once via expiring single-use pairing codes; store hashes on the server. Device assignments constrain trip access. Revocation stops sessions and subsequent collection/sync must cease. Admin mutations reuse session authentication, CSRF and audit logging.

## Persistence and lifecycle
Add devices, assignments, pairing codes, sessions, locations, checkpoints, events and ETA cache. Use unique event IDs, recorded/received timestamps, checked coordinates, indexes and partial uniqueness for active sessions. Delayed offline points must never replace a newer live point. Use a database transaction and session row lock for ingestion and lifecycle transitions. Tracking records must not cascade-delete existing trip content. Session expiry and configured history retention need scheduled maintenance.

## Privacy and delivery
Exact coordinate sharing defaults off. Public/private live queries must revalidate the underlying trip access policy on every request and subscription update. Sanitize responses to exclude device identity and credentials; no-store private/location responses. SSE sends ordered update notifications, heartbeat and reconnect snapshots; polling recovers missed notifications. Initial deployment is a single Node process; multi-process fan-out needs PostgreSQL LISTEN/NOTIFY or a shared broker. Nginx buffering must be disabled. No per-client query loop.

## ETA and checkpoints
Provider abstraction supports configurable OSRM-compatible, openrouteservice or Google Routes with timeouts/cache/rate bounds; default is no provider, hence unavailable ETA. No public demo endpoint is a production default. Provider failure can preserve a bounded stale result. Straight-line distance is only for geofence testing, never road-distance display. Arrival automation requires accurate repeated fresh readings plus dwell time; manual confirmation/skip must persist and be audited. Destination changes invalidate ETA.

## Frontend and Android plan
Preserve SPA layouts/design tokens. Add public `/trip/:slug/live` and `/t/:token/live` plus `/slides`; private tokens follow the existing possession-link policy. Live updates run independently of slide rotation. Maps render only real coordinates/geometry; stale tracking must not be labelled LIVE. Admin controls operate on persisted APIs, with privacy and slide configuration.

Create Kotlin/Compose tracker under `mobile/android-tracker`, with Fused Location Provider, user-started foreground location service, persistent Stop action, Room bounded offline queue, Keystore-protected token storage and WorkManager deferred retries. Request no unnecessary background permission. SDK/library compatibility must be checked before claiming a build. Physical-device lock-screen and interruption QA cannot be replaced by an emulator test.

## Execution and release gates
Deliver incrementally: repository analysis; database/API; Android; admin; customer; slides; security; deployment QA. Run tests after each implemented slice and mark unimplemented or unverified work explicitly. This architecture is a target integration contract, not a claim that all listed components exist. Production release requires HTTPS/proxy tests, backups/restore, routing credentials, retention monitoring, browser authorization tests and physical Android validation. Existing `.env` uses insecure development credentials: rotate before deployment without committing replacements.
