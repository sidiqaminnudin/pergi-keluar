# Phase 0 Audit — Architecture, API, and Data

## Current architecture

- Node.js 20+ ESM application using Express 4.
- Vanilla JavaScript SPA shell served from `public/index.html`; route rendering lives in `public/assets/app.js`.
- PostgreSQL accessed through `pg`; sessions stored in PostgreSQL with `connect-pg-simple`.
- Local media under `storage/uploads`; static paths are `/uploads` and `/assets`.
- One startup path initializes the schema, seeds defaults, and starts the HTTP server.

## API surface observed

### Public

`GET /api/public/site`, `/trips`, `/trips/:slug`, `/private-trips/:token`, `/destinations`, and `/destinations/:slug`.

Public trip queries correctly restrict ordinary listing/detail responses to published public trips. Private links use a SHA-256 token hash, require published/private state, and set `Cache-Control: private,no-store`.

### Admin

The code provides session login, current-user lookup, logout, dashboard, trip CRUD/status/private-link operations, destination CRUD, media upload/list/delete, and settings management. All admin routes are mounted beneath `/api/admin`; authentication is applied route-by-route and a CSRF middleware is mounted for mutating requests.

## Data model

The schema has six application tables: `admins`, `site_settings`, `trips`, `destinations`, `media`, and `audit_logs`. Trip substructures are JSONB, which keeps the MVP simple but moves referential and shape validation into application code.

### Strengths

- Public query filters are explicit and indexed.
- UUID identifiers avoid predictable numeric public IDs.
- Private tokens are not stored in plaintext.
- Session records are externalized to PostgreSQL, suitable for multiple application processes.

### Risks and follow-up

1. Startup schema execution is not a migration system. Introduce versioned migrations before production changes.
2. JSONB trip content needs a versioned schema and validation errors that identify the invalid field.
3. `destination_ids` and media/gallery references are not relational foreign keys; deletion and orphan behavior need a documented policy.
4. Update timestamps and publication timestamps should be consistently maintained and tested.
5. Add pagination/filter limits to admin/public collection endpoints before exposing them to larger datasets.
6. Add database constraints for date ordering, participant ranges, and valid coordinate ranges where practical.

## Architecture conclusion

**Appropriate for an MVP and small deployment.** The next architectural milestone is not a framework rewrite; it is formal validation, migrations, tests, observability, and lifecycle handling for media and JSON content.
