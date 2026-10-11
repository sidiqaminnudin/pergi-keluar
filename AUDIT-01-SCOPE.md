# Phase 0 Audit — Scope, Requirements, and Acceptance

**Date:** 2026-10-11  
**Basis:** `system_map.md`, `README.md`, current `server.js`, `public/assets/app.js`, `db/schema.sql`

## Executive summary

The repository is a functional MVP skeleton for a public trip-information website with an admin CMS. The stated product boundary is clear: visitors do not create accounts, while admins manage published trip content. Booking, payment, customer profiles, and attendance are explicitly out of scope.

The documentation is ahead of the implementation in several areas. The system map describes the target product and acceptance criteria; the current code implements the primary public/admin flows, but it still needs production hardening, automated tests, formal migrations, and stronger payload validation before the acceptance checklist can be considered complete.

## Confirmed scope

- Public pages: homepage, trip listing/detail, private-trip link, destinations, about, and not-found state.
- Admin pages: login, dashboard, trip CRUD/editor/preview, destinations, media, and settings.
- PostgreSQL persistence for admins, settings, trips, destinations, media metadata, and audit logs.
- Local upload storage for the MVP.
- Session-based admin authentication; no customer login.
- Public/private and draft/published trip states.
- Itinerary, stops, linked destinations, important information, and gallery data stored with trips.

## Requirement traceability

| Requirement | Evidence in current repository | Status |
|---|---|---|
| Public website without visitor login | Public routes and `/api/public/*`; README explicitly excludes customer auth | Implemented in MVP |
| Admin login/logout | Session middleware and admin auth routes in `server.js` | Implemented; needs tests |
| Trip draft/publish/archive | Trip status schema and admin routes | Implemented; verify edge cases |
| Public trips exclude drafts/private trips | Public SQL filters `status='published' AND visibility='public'` | Implemented |
| Private trip link can be revoked/rotated | Private token hash column and token route/rotation flow | Implemented; needs security testing |
| Itinerary and trip detail content | JSON columns and editor UI | Implemented; schema validation is weak |
| Destinations and map points | Destination table, trip stops, public rendering | Implemented; validate coordinates |
| Gallery/media | Upload endpoint, media table, trip gallery data | Implemented; needs lifecycle/cleanup policy |
| Editable branding/contact settings | `site_settings` JSONB and admin settings UI | Implemented |
| Audit trail | `audit_logs` table and audit helper | Partial; confirm every mutation is logged |
| Backup/restore tested | Documentation only | Not implemented in repository |
| Automated test suite | No test script or test files | Not implemented |

## Acceptance risks

1. The acceptance checklist says all mutation endpoints must be admin-only. This should be enforced by route-level tests, not only code inspection.
2. The private-link requirement is link possession, not authentication. Do not place participant personal data in private-trip content.
3. JSON fields (`days`, `stops`, `infos`, `gallery`, and ID arrays) are bounded by array length but do not have a documented schema validator.
4. The repository has no formal migration history; startup executes the entire schema and creates missing tables.
5. Production readiness depends on deployment controls described in documentation but not represented as code or CI checks.

## Recommended completion gates

- Add API integration tests for every public/admin route and each role boundary.
- Add JSON payload schemas and coordinate/date validation.
- Add formal migration/versioning and a tested backup/restore runbook.
- Add CI checks for syntax, tests, dependency audit, and environment safety.
- Perform responsive/accessibility checks against the supplied design references.

## Audit conclusion

**Scope definition: sound. MVP implementation: substantially present. Acceptance status: not yet proven without automated and manual verification.**
