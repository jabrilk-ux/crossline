# Signal redesign

Implemented from the supplied “Crossline app redesign.zip” handoff, using primary direction 2a and Home variant 04b. The design HTML and its runtime are references only and are not shipped.

- Shared Geist / Geist Mono type, Signal colors, card radii, auth forms, onboarding shell, state-law cards, profile rows and responsive navigation.
- Home shows bundled flag artwork clipped to the supplied state outline, with last-detected/home-state distinctions preserved. D.C. uses a blue outline fallback.
- Map, Google OAuth, free beta, account controls and trip storage retain existing behavior.
- Crossing notification taps, and foreground native restriction notifications, open a dedicated screen that queries current reviewed guidance. It never copies mock legal instructions or invents permit verdicts.
- Mock legal claims, permits, expiry dates, history and always-on tracking indicators are not production data. Missing guidance stays unknown. Google remains the working provider; no inactive Apple button is shown.
- Browser onboarding points to foreground map location instead of requesting unsupported background permission.

Verification: TypeScript, existing unit suite, exported-web browser regression suite (synthetic APIs/geolocation), mobile and desktop screenshots. Native device and App Store submission testing are separate from the web deployment.
