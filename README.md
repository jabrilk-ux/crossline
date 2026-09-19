# Crossline

Crossline is an Expo mobile reference app for firearm owners traveling between U.S. states. It includes account/profile onboarding, reviewed law summaries, profile-scoped guidance, optional background crossing alerts, and trip briefs. This is an **invited, free beta**, not a legal determination or a public-launch-ready release.

## Run locally

```sh
npm ci
cp .env.local.example .env.local
npm start
```

The example contains the attached project's client-safe URL and publishable key. `.env.local` stays out of Git. Never place service-role/secret keys in an `EXPO_PUBLIC_` variable. Web supports account flows, state browsing, and manual trips; background tracking requires a native development or installed build.

```sh
npm run web
npm run typecheck
npm test
npm run check:backend
npx expo export --platform ios --platform android --platform web
```

For an installed build, configure your Expo/EAS project and platform signing, then use the `development` or `preview` build profile in `eas.json`. This repository does not contain signing credentials or an assigned EAS project ID.

## Implemented beta behavior

- Expo Router entry and protected navigation; email signup, confirmation callback, recovery, and account restoration.
- Atomic, retryable onboarding through `save_onboarding`; profile/permit save failures stay visible.
- All beta features are free. RevenueCat is not initialized and purchases are disabled. Apple OAuth is not advertised.
- Native background tasks, foreground tracking, accuracy filtering, and a second observation at least 20 seconds later to confirm a crossing. Initial location is not counted as a crossing. Alerts are local notifications; no push delivery server is needed.
- Tracking and alert switches persist per user. Crossing-history saving is opt-in. Users can clear history and delete their account after password confirmation.
- Law reads exclude flagged, unreviewed, stale (90+ days), future-effective, and rescraped-since-review summaries. No legal content has been seeded or represented as human reviewed.
- Carry guidance uses separate published, dated, scoped `carry_rules`. It requires matching home state (where scoped), permit issuer/type, known valid permit expiry, firearm type, purpose, magazine limit, and suppressor scope. Missing information returns unknown. Conflicting matching rules choose the more restrictive outcome. The map, home, trips, and notifications use the same evaluator.
- Manual state-by-state trip planning works without a directions account. Optional OSRM-compatible driving routes use full road geometry and state-boundary intersections, never a straight-line shortcut. Saved briefs are device-local and dated; reopened copies do not assert current carry status.

## Connected backend

Supabase project: `ewfrwvymnxdsyxqafklh` (`jabrilk-ux's Project`). The SQL migrations have been applied to this project, including review filtering, scoped carry rules, onboarding RPC, history deletion, and cascading account deletion. The authenticated `delete-account` Edge Function is deployed. It validates the caller with Auth, revokes refresh sessions, and deletes only that caller. The gateway JWT check is disabled because authentication is implemented inside the function with `getUser`; unsigned requests receive 401.

For a fresh database, apply migration files in filename order. Do not blindly reapply initial migrations to the connected project. Hosted migration timestamps differ from the repository's legacy filenames; reconcile migration history with Supabase tooling before using automated `db push` against this existing project.

## Required before inviting real users

See [docs/BETA_RELEASE.md](docs/BETA_RELEASE.md) for the concrete external setup and device test checklist. Key blockers remain reviewed legal content, email delivery/redirect configuration, and signed physical-device testing. Driving directions additionally require a provider; manual planning remains usable without one.

## Data ingestion and review

The server-only ingestion pipeline requires `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. It is not run automatically by the mobile app.

```sh
npm run scrape:dry
npm run scrape -- --state=VA --category=carry
```

Every new scrape invalidates prior review until a human reviewer checks the content and updates `last_verified`. Do not publish a rule based solely on AI confidence. See [docs/CONTENT_REVIEW.md](docs/CONTENT_REVIEW.md).

## Verification

- `npm test`: pure evaluator, stale/unreviewed rules, permit scope/expiry, crossing jitter, road geometry and state re-entry.
- `npm run typecheck`: app TypeScript; `npx tsc --noEmit --project tsconfig.scraper.json`: ingestion TypeScript.
- `npm run check:backend`: live public-key/Auth connection, anonymous database denial, unauthenticated deletion denial. No writes.
- `tests/backend.sql`: transactional SQL assertions for onboarding retries/rollback, isolation, review filtering, deletion, and cascades. It creates synthetic fixtures and rolls everything back.
- `node tests/browser-smoke.cjs`: run against a local Expo web server on port 8081 (or `CROSSLINE_TEST_URL`). Uses mocked Supabase responses and sends no emails or account mutations. Covers signup validation, confirmation messaging, recovery request, login, onboarding, restart restoration, manual trips, saved briefs, and privacy navigation. It does not prove live SMTP delivery, native callbacks, or physical background execution.

Compatible dependency security fixes were applied. Some advisories remain in the Expo 54/build-tool dependency tree and the server-only Anthropic SDK; review the current `npm audit` report before a public release. No forced major SDK migration was applied.

### East Coast references

The public `/references` screen provides dated research notes, official sources and open questions for the 14 Atlantic coastal states. It is accessible from sign-in and Profile; law and trip screens expose the same references. Bundled notes remain separate from independently reviewed backend guidance and cannot set carry status. After 90 days their summaries are hidden pending refresh. Source verification limitations and out-of-scope jurisdictions are explicit. See `docs/legal/EAST_COAST_SOURCES.md` for the research register.
