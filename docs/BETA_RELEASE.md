# Beta release checklist

## External setup still required

1. **Auth redirects:** Sign in to the Supabase dashboard, select project `ewfrwvymnxdsyxqafklh`, and open Authentication → URL Configuration. Add the exact mobile callbacks `crossline://auth-callback` and `crossline://auth-callback?recovery=true`. The app defines the `crossline` scheme. The dashboard was signed out during implementation, so these settings were not changed. Confirm production web callback URLs separately if distributing a hosted web app; current email callbacks target the installed mobile app.
2. **Email delivery:** Configure a verified sender/domain and SMTP provider in Supabase for real invitees. Test signup confirmation and recovery on an address outside the project team. The code does not disable email confirmation or bypass provider restrictions. No support/privacy email was supplied; the beta information screen directs invited testers to their inviter. Publish a real support channel and final privacy policy before public distribution.
3. **Reviewed coverage:** Publish a deliberately limited set of independently reviewed state summaries and scoped carry rules. There are no reviewed law rows or carry rules in the attached project yet. Empty/unknown is intentional. Do not advertise nationwide verified coverage.
4. **Signing and distribution:** Link the correct Expo/EAS project and configure Apple/Google developer credentials outside this repository. Create an installed preview build. No signed IPA/APK or store submission has been produced by the code changes.
5. **Maps:** Android's native Google map needs a Google Maps SDK key restricted to the application/signing identity. Configure `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID` before building. iOS uses the platform map provider. The web state directory does not need a maps key.
6. **Optional directions:** Configure an HTTPS OSRM-compatible server as `EXPO_PUBLIC_ROUTING_URL` and an OpenCage key for address search. A production-hosted provider/server is required; the app deliberately does not rely on a public demo endpoint. Provider availability, cost, attribution and privacy terms must be checked before enabling. Manual state planning and saved briefs work without these credentials.
7. **Dependency review:** Run `npm audit`, address remaining applicable advisories, and plan an Expo SDK upgrade before public launch. Do not force incompatible dependency upgrades without rebuilding and native verification.

## Physical-device acceptance tests

- Create and confirm a new email account, log in, finish onboarding with and without permissions, force-close/relaunch, and confirm all profile/permit fields reload.
- Open confirmation and recovery links in an installed app; expired links must show a recoverable error. Reset the password and sign in again.
- Test iOS and Android with background permission granted, denied, revoked, and granted later. Verify the visible tracking state matches reality.
- With the screen locked, cross a boundary; verify exactly one local notification after confirmation. Test GPS jitter, poor accuracy, duplicated/out-of-order updates, airplane mode, and battery restrictions. Force-quitting can stop background delivery; do not promise otherwise.
- Toggle alerts off while tracking continues; no new notification should fire. Turn tracking off; no new location processing should occur.
- Leave history saving off and confirm no crossing rows are created. Enable it, create crossings, reload, clear history, and verify it stays cleared. Clear saved trips and sign out; local trip files must be removed.
- Test missing, stale, flagged and rescraped rules. All must remain unavailable. Test permit issuer, residency, expiry, firearm type, magazine and suppressor differences with reviewer-approved fixtures.
- Test a driving route through a narrow state and a state re-entry when a provider is configured. Compare with the provider's actual geometry. No-route and provider errors must not produce a fabricated brief.
- Delete a disposable beta account using its password. Verify Auth, profile, permits, history and device-local data are removed, and refresh sessions are revoked. Test expired credentials and a failed deletion response.

## Automated evidence

The app/ingestion typechecks, core tests, browser fixture flow, live read-only API checks, transaction-rolled-back database tests, and iOS/Android/web JavaScript exports are recorded in the PR. JavaScript export is not a signed native build or physical-device test.
