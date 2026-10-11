# Phase 0 Audit — Security and Operations

## Controls already present

- Helmet is enabled (with CSP disabled).
- Passwords are hashed with bcrypt.
- Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Login is rate-limited.
- Login regenerates the session and creates a per-session CSRF token.
- Mutating admin requests require the CSRF header; cross-origin Origin/Host is checked when Origin is present.
- Private tokens are hashed before database lookup.
- Dynamic frontend text is generally escaped through `esc()` before HTML interpolation.
- Upload handling is implemented with file-size/type checks and local storage.

## High-priority risks

1. **CSP is disabled.** Add a deliberate production CSP after confirming the inline/script/style strategy; do not leave this disabled by default indefinitely.
2. **CSRF origin checking is conditional.** Requests without an Origin header rely on the CSRF token. Confirm behavior for all supported clients and proxy configurations.
3. **Payload validation is incomplete.** Array limits are not equivalent to validating nested object shape, URLs, dates, coordinates, or safe media references.
4. **No automated security regression suite.** Authentication, authorization, private-link behavior, upload rejection, and XSS cases need tests.
5. **Error logging is raw server-side logging.** Define structured logging, secret/PII redaction, request IDs, and retention.
6. **Local uploads need operational controls.** Configure disk quotas, backups, orphan cleanup, filename policy, malware scanning as appropriate, and ideally serve uploads from a separate origin/path.
7. **Session production settings need deployment verification.** HTTPS, proxy trust, session-store cleanup, and cookie behavior must be tested behind Nginx.

## Operational checklist

- Use a strong unique `SESSION_SECRET`; never use the example password.
- Keep `.env` outside version control and rotate credentials after exposure.
- Restrict PostgreSQL network access and use a least-privilege database role.
- Back up both PostgreSQL and `storage/uploads`; perform and record restore tests.
- Add health/readiness endpoints that verify database connectivity without leaking configuration.
- Add dependency scanning and lockfile policy to CI.
- Run behind HTTPS and a reverse proxy; set `TRUST_PROXY=1` only for a trusted proxy.
- Define admin account recovery, deactivation, and audit-log retention procedures.

## Security conclusion

**Good baseline for an MVP, not production-complete.** The largest immediate engineering gains are strict input schemas, automated authorization tests, CSP hardening, upload lifecycle controls, and a tested backup/restore process.
