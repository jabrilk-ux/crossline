# Legal and launch review — September 18, 2026

## Scope and conclusion

Reviewed repository notice, authentication/privacy flows, ingestion configuration and public provider/platform documents. No executed vendor agreement, business formation documents or separate contracts were supplied. This is an issue-spotting and drafting review, not attorney approval or a nationwide firearm-law opinion. Public release remains blocked by the items below.

## Findings and changes

| Finding | Action / outstanding evidence |
| --- | --- |
| No formal terms; privacy notice lacks operator/contact/retention details | Added working terms and privacy drafts. Missing facts are explicit placeholders; drafts are not published contracts. |
| Privacy notice omitted platform map requests, network logs and local-storage limits | Updated the in-app factual notice, including authorized administrator access. |
| AI confidence could clear the scraper's review flag | All ingestion writes now force `flagged=true` and clear `last_verified`, including updates to previously reviewed content. Separate review is required. Existing database review gates remain in place. |
| Pennsylvania category mappings pointed at unrelated subjects | Removed prohibited-locations→6112, duty-to-inform→6118 and storage→6110.2 mappings. Official chapter identifies dealer licensing, antique firearms and altered serial numbers respectively. Replaced the incorrectly located transport URL with the official Title 18 chapter as a research candidate, not approved guidance. |
| Remaining source catalog is incomplete/unverified | Includes Florida links pinned to 2023 and secondary-source links. Audit chosen beta states, current effective law, exceptions and court orders before publishing. A missing source means unknown, never no restriction. |
| Profile cannot establish all legal prerequisites | Do not publish unconditional allowed rules where material facts are unmodeled. No substantive legal rules were approved or published in this review. |
| External deletion channel absent | Prepare a public request page and monitored channel before Google Play distribution; in-app deletion alone does not complete that platform requirement. |
| Credentials / native evidence absent | SMTP sender, redirect settings, EAS project, signing identity, Android map key and physical-device tests remain external setup. `xcrun --find simctl` failed: simulator utility unavailable in this environment. |
| Dependency risk remains | Current npm audit: 27 advisories (17 moderate, 10 high, zero critical). Remediation suggestions include major Expo upgrade; complete a dedicated SDK migration and native validation, not forced overrides. |

## Provider contract observations

**Supabase:** Public terms retain customer responsibilities for lawful data and configuration, incorporate a DPA, and include customer indemnity provisions. Confirm the actual account holder, plan/order terms, DPA, subprocessor coverage, retention and security settings. Attaching a project does not establish that Crossline has completed this review. [Supabase terms](https://supabase.com/terms), [privacy policy](https://supabase.com/privacy).

**Email:** Supabase's default mail service restricts recipients; configure a verified custom sender and SMTP service for real beta users. Select the provider and obtain its account/DPA and retention details before describing it in the final policy. [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

**Maps and directions:** Native map providers are Apple/Google. OpenCage and an OSRM-compatible endpoint are optional; no routing provider has been selected. Review the actual plan's permitted production use, attribution, caching, privacy and data terms before enabling. An API protocol does not supply a hosting contract. [OpenCage terms](https://opencagedata.com/terms). No third-party contract was accepted or purchased during this review.

## Platform and legal sources checked

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), sections 1.1.3, 5.1.1 and 5.1.5: review firearm-related product presentation, publish accessible privacy disclosures, support deletion, and explain location use. This is not a prediction of store approval.
- [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311): provide a public privacy policy and an external as well as in-app account-deletion request path; disclose data handling accurately.
- [Pennsylvania official Title 18, Chapter 61](https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.061..HTM): source for the mapping corrections above; not a complete state review.
- [18 USC 926A, official preliminary code](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section926A&num=0&edition=prelim): interstate transport protection has prerequisites concerning eligibility, endpoints and transport conditions. A state list or carry-permit match alone cannot establish these. Interpretation, stops and case law require additional review.

## Completion inputs

Operator business address (name confirmed as Crossline); monitored support/privacy email and domain; intended ages; provider account access; actual retention schedules; qualified reviewer for the selected legal coverage; Apple/Google/Expo account and device access. Do not paste private keys into chat. Configure secrets through the relevant provider's secure settings.

## Owner clarification

The operator name is Crossline. The selected beta scope is the 14 Atlantic coastal states listed in BETA_RELEASE.md. Google email and Android signing are the preferred setup path; account/domain availability is still unconfirmed. The geographic decision does not approve the source catalog or publish legal guidance.
