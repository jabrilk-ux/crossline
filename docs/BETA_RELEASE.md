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
- Delete a disposable beta account by typing DELETE while signed in. Test both Google and email accounts. Verify Auth, profile, permits, history and device-local data are removed, and refresh sessions are revoked. Test expired sessions and a failed deletion response.

## Automated evidence

The app/ingestion typechecks, core tests, browser fixture flow, live read-only API checks, transaction-rolled-back database tests, and iOS/Android/web JavaScript exports are recorded in the PR. JavaScript export is not a signed native build or physical-device test.

## Legal review follow-up (September 18, 2026)

See [review findings](legal/REVIEW.md), [privacy working draft](legal/PRIVACY_POLICY_DRAFT.md) and [beta terms working draft](legal/BETA_TERMS_DRAFT.md). These drafts are not effective user contracts. Complete operator/contact/audience/retention details, review, publish stable public URLs, and implement versioned terms acceptance before treating them as binding.

For Google Play, provide an external account-deletion request page as well as the in-app flow. Publish the monitored request channel, verify account control, revoke sessions/delete the account using the supported admin workflow, record completion without retaining unnecessary personal data, and confirm cascaded deletion. Never request a user's password by email. This external process is not operational until a real channel and operator are assigned.

## Confirmed beta scope and preferred providers

Operator name: **Crossline**. Planned legal-content scope: **Maine, New Hampshire, Massachusetts, Rhode Island, Connecticut, New York, New Jersey, Delaware, Maryland, Virginia, North Carolina, South Carolina, Georgia and Florida**. These are the 14 Atlantic coastal states; this decision does not certify or publish any law content. Review federal requirements and any out-of-scope jurisdictions on an actual trip separately.

Google can provide a business mailbox through Google Workspace and authenticated SMTP for Supabase, subject to account policies and sending limits. Confirm the owned domain, monitored sender/support address and Workspace administrator access first. Store SMTP credentials only in Supabase’s secure Auth settings. Verify signup and recovery delivery before inviting users. [Google setup guidance](https://support.google.com/a/answer/176600).

For Android, use a Google Play developer account and Play App Signing, with an upload key managed through Expo/EAS or secured locally. Google’s app-signing certificate is distinct from the upload certificate; use the appropriate signing identity when restricting the production Maps key. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756). For iOS distribution, Apple Developer credentials are still required; Google cannot replace them. [Expo credentials](https://docs.expo.dev/app-signing/app-credentials/). None of these provider accounts or credentials has been provisioned by this documentation update.

## Google sign-in implementation

Google OAuth is enabled on the attached project (confirmed through its public Auth settings on September 22, 2026). The app now offers Continue with Google for sign-in and sign-up, uses PKCE, exchanges callbacks once across native browser/screen handlers, and sends new users through existing onboarding. Mobile uses an external authentication session; web redirects in the same tab. Email sign-in remains available. Google users do not need Crossline confirmation/reset emails; email users still need working SMTP.

Google Cloud authorized redirect URI: `https://ewfrwvymnxdsyxqafklh.supabase.co/auth/v1/callback`.

Supabase Authentication → URL Configuration must allow `crossline://auth-callback` for installed builds. Web testing also needs the exact current origin plus `/auth-callback` (for this local test: `http://localhost:8081/auth-callback`). Add the corresponding `?recovery=true` email-recovery redirects. The app cannot set this server allowlist; its contents have not been verified in this implementation. Do not add arbitrary wildcard production origins.

Account deletion now uses the authenticated session and typed DELETE confirmation for both account types. The deployed endpoint independently validates the bearer token and deletes only that user. No client-supplied target user ID or provider metadata authorizes deletion. Password re-entry was removed; no new server-side recent-authentication requirement is claimed.

Browser fixtures exercise Google authorization parameters, PKCE exchange, onboarding, session restoration and passwordless deletion without touching real accounts. Native cancellation/success/unexpected callbacks have unit coverage. A real Google account round trip and installed iOS/Android deep links still require manual verification; Expo Go is not the installed `crossline` build. No real account was deleted during implementation.
