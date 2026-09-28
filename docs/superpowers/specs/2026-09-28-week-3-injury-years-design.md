# Week 3 injury years

Add WEEK_3_INJURY_YEARS to NFLQuery's existing query dropdown. Everything is independent of fantasy420. Historical appearances and team schedules come exclusively from NFLQuery data_v6 box scores. ADP comes from Fantasy Football Calculator, standard 12-team, stored locally with provenance. Use the earliest verifiable populated archive and retain missing-year metadata.

The extract and mapPoints textboxes contain the full absence inference and scoring algorithm. QueryHelpers holds static ADP_BY_YEAR, CURRENT_INJURY_WEEKS, and snapshot/source metadata; it must not hide the scoring function.

For historical seasons find the consecutive absence stretch at the Week 3 boundary (missing Week 3 or the first team game after Week 3), stopping at the first later box-score appearance. Count scheduled games after Week 3 only, excluding byes and postseason. Presence in an offensive or kicking/return box-score category counts regardless of fantasy score; defensive categories are excluded to avoid namesake collisions. Include opening absences using the ADP team when a player has not appeared. Normalize names and relocated team abbreviations; expose skipped/unmatched data. These are inferred absences, not confirmed medical diagnoses, and can include benchings/suspensions or an injury sustained before Week 4 rather than during Week 3. No historical news or forecasts.

For 2026 research all players in the user's two status snapshots using current news. Store one point-estimate map of player name to anticipated missed regular-season week numbers after Week 3 (empty array means no future absence estimated). Preserve raw status input and source/rationale metadata separately. A status with no clear prognosis still needs an explicit modeling estimate, not invented reporting.

Score = sum(exp(-(ADP-1)/35) * missedGames). Single score, no uncertainty range. The fixed scale is one point per future missed game at ADP 1. Show per-player ADP, missed weeks, weight and contribution. Historical seasons use observed future absences; 2026 uses the dated static estimate. Results must make this distinction clear.

Validate bye handling, return stopping, Week 3 exits, late injuries excluded, zero-point appearances, opening/season-long absence, name aliases, current snapshot and serialized query customization. Run focused tests, TypeScript and production build. Commit task-owned changes and push main under workspace defaults, preserving pre-existing work.
