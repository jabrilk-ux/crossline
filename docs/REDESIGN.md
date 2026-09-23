# Signal redesign

Implemented from the supplied “Crossline app redesign.zip” handoff, using primary direction 2a and Home variant 04b. The design HTML and its runtime are references only and are not shipped.

- Shared Geist / Geist Mono type, Signal colors, card radii, auth forms, onboarding shell, state-law cards, profile rows and responsive navigation.
- Home shows bundled flag artwork clipped to the supplied state outline, with last-detected/home-state distinctions preserved. D.C. uses a blue outline fallback.
- Google OAuth, free beta, account controls and trip storage retain existing behavior.
- Crossing notification taps, and foreground native restriction notifications, open a dedicated screen that queries current reviewed guidance. It never copies mock legal instructions or invents permit verdicts.
- Mock legal claims, permits, expiry dates, history and always-on tracking indicators are not production data. Missing guidance stays unknown. Google remains the working provider; no inactive Apple button is shown.
- Browser onboarding points to foreground map location instead of requesting unsupported background permission.

Verification: TypeScript, existing unit suite, exported-web browser regression suite (synthetic APIs/geolocation), mobile and desktop screenshots. Native device and App Store submission testing are separate from the web deployment.

## Browser usability follow-up

- Replaced the outline-only web map with Leaflet street tiles from OpenStreetMap. Location follows a foreground browser watch, shows a blue dot and accuracy circle, stops following on pan, and recenters with Locate me. Stale fixes remain labeled. Permission denial and tile failures have actionable recovery controls. Browser permissions and device accuracy still govern availability; this is not turn-by-turn navigation.
- State selection and regional views remain available on top of the street map. State borders never imply legal clearance. The map instance and requests are released when navigating away.
- OpenStreetMap attribution remains visible. Standard browser caching is used with no offline download or prefetch feature. The public tile service is best-effort; choose a capacity-backed tile provider before substantial launch traffic. Provider policy: https://operations.osmfoundation.org/policies/tiles/ ; library setup: https://leafletjs.com/examples/quick-start/ . Privacy copy identifies map-area/IP sharing with the tile provider.
- Choose states now opens a searchable, accessible route picker. Stops can be added, repeated for re-entry, reordered, removed, and canceled without changing the route. Existing brief preparation and device storage use the selected order. Unconfigured driving directions are not presented as an inert button.
- Tab and stack scene backgrounds cover the full desktop width. Laws uses a bounded state selector, starts from the detected/home state when not deep-linked, and keeps long research notes behind an explicit disclosure while leaving verification limits and official sources visible.
- Shared action buttons provide hover/press feedback and respect reduced-motion settings for scaling.

Validation: TypeScript and 15 unit tests; exported-web regression at 390px mobile and 1920px desktop, including no white gutter, law selection, mocked tile outage/retry, location updates, pan/recenter, stop, route search/reordering/re-entry/cancel, briefing save/open, OAuth onboarding and account controls. Account APIs, coordinates, and tile responses are fixtures in the automated tests. Native JavaScript export is also checked; physical-device and App Store validation remain separate.
