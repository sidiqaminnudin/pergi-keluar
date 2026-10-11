# Phase 0 Audit — UI, Design, and Frontend Implementation

## Reference alignment

The repository contains four raster mockup references and documents their role correctly: they are visual collages, not Figma layers or production assets. The implemented palette (`#f45b17`, dark ink, light canvas) and mobile-first CSS are a reasonable interpretation rather than a claim of pixel-perfect tracing.

## Implemented route map

The SPA recognizes the documented public routes (`/`, `/trip`, `/trip/:slug`, `/t/:token`, `/destinasi`, `/destinasi/:slug`, `/tentang`) and admin routes for login, dashboard, trip editing/preview, destinations, media, and settings. The app uses browser history navigation and a single HTML shell.

## Positive findings

- `esc()` is used for dynamic text and attributes before HTML interpolation.
- The app has loading/error-toasts and a retry path for failed rendering.
- Public and admin layouts are separated through rendering functions.
- Responsive styling and mobile navigation are represented in `styles.css`.
- Admin editing is divided into tabs that match the product model: basic information, itinerary, destinations, stops, information, and gallery.

## UX/accessibility follow-up

1. Add automated HTML/accessibility checks for labels, focus order, keyboard navigation, button names, contrast, and image alt text.
2. Confirm all interactive controls are buttons/links with visible focus states, especially custom tabs, menus, and map controls.
3. Test empty, loading, 404, unauthorized, expired private-link, and API-error states on both mobile and desktop.
4. Validate external image failures and slow networks; remote Unsplash assets are acceptable demo content but not a production media strategy.
5. Confirm date formatting/time-zone behavior for users outside Indonesia.
6. Review map semantics and ensure the UI distinguishes location markers from actual routed navigation.
7. Add confirmation and recovery behavior for destructive media/trip actions.

## Design-system follow-up

- Centralize repeated spacing, typography, and component states as CSS variables/components.
- Document the minimum supported viewport widths and browser targets.
- Replace demo photos with owned/licensed assets and meaningful alt text before launch.
- Consider progressive enhancement for public content and metadata/SEO once content requirements are finalized.

## UI conclusion

**The frontend is a coherent MVP adaptation of the references.** It needs browser-based responsive/accessibility QA and production content/assets; a redesign is not required to proceed with backend hardening.

---

## Addendum — Responsive capture pass (Playwright, 375/768/1440)

### Method
`tools/capture.mjs` boots Chromium (via `playwright`) against `http://localhost:3000`, loads 7 public routes at three viewports, waits for `document.fonts.ready`, takes a `fullPage` screenshot, and records `scrollWidth`, `clientWidth`, every element whose bounding rect crosses the viewport, console errors, and failed requests. Output is written to `docs/screenshots/<TAG>/` with a `report.json`. The first run was tagged `before`, the fixup run was tagged `after` (`$env:TAG='after'; node tools/capture.mjs`).

### Finding addressed
`docs/screenshots/before/report.json` showed `trip-detail` at 375 px with `scrollW: 594, clientW: 375, hScroll: true` (scrollH 3345). The page-level overflow was caused by the `.detail-grid` and its descendants lacking `min-width:0`, and by long text in the timeline/info panels and the OpenStreetMap iframe refusing to break — the grid track was forced wider than the viewport by its content. (The per-element `overflowing[]` array was empty on the `before` run because the grid's own rect exceeded the viewport rather than a child's; the `scrollW`/`clientW` delta is the authoritative signal.)

### Fix
Appended to the existing `@media(max-width:760px)` block in `public/assets/styles.css` (no new rules created, no selector widened for desktop):

- `.detail-grid, .detail-grid > * { min-width: 0 }` — stops the grid track from being forced wider than the viewport by its content.
- `.timeline-item p, .info-row p, .map-caption, .stop { overflow-wrap: anywhere }` — allows long location names / URLs to break.
- `.detail-hero h1 { overflow-wrap: anywhere }` — same for the big hero title.
- `.detail-grid img, .detail-grid iframe { max-width: 100% }` — hard cap for the embedded OpenStreetMap iframe and gallery images.

No HTML, no JS, no desktop styles were modified.

### Result — `docs/screenshots/after/report.json`
All 21 route×viewport combinations now report `scrollW === clientW` and `hScroll: false`:

| Route | 375 | 768 | 1440 |
|---|---|---|---|
| home, trip-listing, destinasi-listing, tentang, trip-detail, destinasi-detail, admin-login | ✓ | ✓ | ✓ |

The one remaining entry in `overflowing[]` is on `trip-detail__375`: three `<button>` elements with `left: 342..546`. They are the tabs rendered by `app.js detail()` inside `<nav class="tabbar">`, and `styles.css` sets `.tabbar { display:flex; gap:30px; overflow:auto }` — i.e. they live in an intentional horizontally-scrollable rail. The capture tool compares each child rect to `window.innerWidth` and cannot tell that the parent clips/scrolls, so it reports them even though `documentElement.scrollWidth` is 375. This matches the mobile reference, which shows a swipeable tab strip, and does not need a layout change.

### Known limitations of the capture pass
- `admin-login` logs a `401 Unauthorized` from the session-probe XHR. This is the correct unauthenticated response, not a bug.
- Admin screens (`/admin`, `/admin/trips`, `/admin/trips/create`, `/admin/destinations`, `/admin/media`, `/admin/settings`) are only captured when `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are exported before running the tool. They were not set during this pass, so admin captures were skipped. The responsive rules that back those pages (`.sidebar`, `.admin-top`, `.admin-body`, `.kpis`, `.editor`, `.upload-grid`, `.form-grid`) are already covered by the existing 1050/760/490 breakpoints and were not touched.
- Remote Unsplash images are loaded at capture time. If the network blocks `images.unsplash.com`, screenshots will differ but the overflow/`hScroll` metrics are DOM-based and remain valid.
- `app.js` contains a few mojibake artifacts (e.g. `â€“` where an en-dash was intended, visible in participant counts). This is a text/encoding issue in a template literal, not a layout issue, and is out of scope for this UI pass — flagging it for the content/i18n follow-up.

### Reproducing
```
npm start                        # terminal 1
$env:TAG='after'; node tools/capture.mjs   # terminal 2 (PowerShell)
# optional admin coverage:
# $env:SEED_ADMIN_EMAIL='...'; $env:SEED_ADMIN_PASSWORD='...'; node tools/capture.mjs
```
Artifacts land in `docs/screenshots/<TAG>/` with a machine-readable `report.json` next to the PNGs.

