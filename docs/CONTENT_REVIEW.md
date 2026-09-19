# Publishing reviewed guidance

The mobile client cannot write law summaries or carry rules. Use the project's trusted server/admin workflow. Do not grant client roles write access to these tables.

1. Collect the primary source, applicable jurisdiction, effective date and exact scope. Review the actual source text, exceptions, recognition relationships and changes. AI output is a draft.
2. For `state_laws`, verify the summary and source link, clear `flagged` only after review, and set `last_verified` after the latest `last_scraped`. The database hides a row when it is flagged, unreviewed, more than 90 days old, future-effective, lacks an HTTPS source, or has been scraped after review.
3. Create carry rules as unpublished drafts. Specify destination state, home-state scope, exact permit issuer/type (or explicit permitless scope), a single firearm type and purpose, magazine/suppressor limits, clear explanation and primary source, effective/expiry dates and reviewer timestamp. Publish only when independently reviewed. Do not use a blanket “any resident permit” rule.
4. Confirm the app's collected profile captures every material condition for that rule. If it does not (for example an eligibility or location-specific exception cannot be established), do not publish an unconditional allowed result. Use a restricted explanation or leave status undetermined until the data model supports it. The app does not establish legal eligibility.
5. Check the rendered source, explanation and effective period and run profile-matching tests. No permit-expiry date or an expired permit yields undetermined permit-based guidance.
6. Unpublish changed rules promptly. Review at least every 90 days and set earlier expiry for time-sensitive rules. Refresh clients before relying on changes; saved offline briefs always warn that status is undetermined.

The initial database is intentionally empty. Synthetic examples in `tests` are not legal guidance and must never be published as content.
