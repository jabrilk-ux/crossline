# Crossline

Crossline is an Expo mobile application that helps firearm owners understand how their permits and firearm profile interact with laws when traveling between U.S. states. It was built to detect state-line crossings, surface plain-English legal information, and alert users when carry rules may change.

> Crossline is an informational reference tool, not legal advice. Laws change frequently. Users should verify current requirements with official state sources or a qualified attorney before acting.

## Features

- Permit and firearm-profile onboarding
- Background location tracking and state-line crossing detection
- Push alerts when entering a new state
- Personalized carry-status map
- State law browser organized by carry, transport, vehicle, magazine, suppressor, and related categories
- Trip planning and profile management
- Free, Pro, and Pro Plus subscription tiers through RevenueCat
- Law-data scraper that reads official sources, summarizes statutes with Claude, cross-checks results, and flags low-confidence records for human review

## Tech stack

- Expo 54, React Native, React 19, and Expo Router
- TypeScript, Zustand, and NativeWind
- React Native Maps and Turf
- Expo Location, Task Manager, and Notifications
- Supabase Auth and Postgres
- RevenueCat subscriptions
- Playwright, Cheerio, and Anthropic for the separate law-ingestion pipeline

## App setup

Requirements:

- Node.js
- Expo tooling
- A Supabase project

```bash
npm ci
cp .env.local.example .env.local
npm start
```

You can also launch a target directly:

```bash
npm run ios
npm run android
npm run web
```

## Environment

The mobile app uses:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY` is also supported)
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

The server-side scraper additionally uses:

- `ANTHROPIC_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose the Supabase service-role key in the mobile application.

## Law ingestion

Run all configured state/category jobs:

```bash
npm run scrape
```

Useful scoped and safe-preview commands:

```bash
npm run scrape -- --state=VA
npm run scrape -- --state=VA --category=carry
npm run scrape:dry
```

Scraped summaries below the confidence threshold are flagged for human review, and human verification dates are not overwritten by automated updates.

## Connected Supabase backend

Project: `ewfrwvymnxdsyxqafklh` (`jabrilk-ux's Project`). The example environment contains this project's public URL and publishable key, which are intended for client use. `.env.local` is ignored by Git. Never add a service-role or secret key to an `EXPO_PUBLIC_` variable.

The migrations in `supabase/migrations` provision `users`, `permits`, `state_laws`, and `crossing_events`. Row-level security limits profiles, permits, and crossing events to their owners. Authenticated users can read law data; only the server-side ingestion pipeline can write it. The connection migration adds explicit Data API grants and the unique state/category index required by the scraper.

These migrations have been applied to the connected project. For a new project, apply all migration files in filename order. Do not reapply the initial migrations to an existing database. Native sessions use AsyncStorage and refresh while the app is active.

The database initially contains no law records. Law ingestion still requires server-side Supabase credentials and `ANTHROPIC_API_KEY`; these are not included in the mobile environment.

Run `npm run check:backend` to verify the public key, Auth endpoint, and anonymous access restrictions without creating users or changing data.
