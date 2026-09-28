# Week 3 injury-year query data

`WEEK_3_INJURY_YEARS` is a permanent NFLQuery dropdown query. Select it, inspect or edit the extract/mapPoints textboxes, then click Customize. The entire inference and scoring algorithm is in those functions; there is no hidden scoring helper.

## Variables available to custom queries

- `window.QueryHelpers.ADP_BY_YEAR`: year → Fantasy Football Calculator standard 12-team player list with name, position, team, numeric ADP and bye.
- `window.QueryHelpers.CURRENT_INJURY_WEEKS`: player → estimated future missed regular-season week numbers. Frozen September 28, 2026 before Week 3 Monday Night Football. Empty arrays mean no additional full-game absence estimated.
- `window.QueryHelpers.CURRENT_INJURY_SOURCES`: snapshot date and per-player evidence/rationale, including team, bye and return-week assumptions.
- `window.QueryHelpers.ADP_SOURCES`: provider, original archive metadata, retrieval date, per-player 2026 chart URLs/dates and known gaps.
- `window.QueryHelpers.NFL_PLAYER_ALIASES` and `NFL_TEAM_ALIASES`: static identity mappings.

No fantasy420 data, code, rosters, draft boards, or network requests are used.

## Score

`sum(Math.exp(-(adp - 1) / 35) * missedWeeks.length)`

One point equals one future missed scheduled game at ADP 1. This smooth scale values picks 9/10/11 at approximately 0.796/0.773/0.751. Only weeks after Week 3 count. Scores are not normalized against whichever years happen to be loaded, so adding another year does not change an existing score.

For completed seasons, NFLQuery's own game box scores establish appearances. Any offensive or kicking/return appearance counts, regardless of fantasy points; defensive categories are excluded to avoid merging defensive namesakes. The first appearance after Week 3 ends the absence stretch, including a return for a different team. Only scheduled team games before that return are counted, so byes and postseason do not count. A player appearing in Week 4 has zero remaining burden even if they miss games later. This captures Week 3 exits and earlier/season-opening absences. Historical team fields in the ADP archive can reflect later trades; observed NFLQuery team membership takes precedence.

This is a **box-score absence proxy**, not a confirmed medical injury registry. It can include benchings, suspensions, holdouts and an injury first suffered in practice before Week 4. A player with no season appearance is explicitly labeled cause unknown. Players without an identifiable team schedule or ADP remain explicitly unscored. There is no historical news research or historical injury forecast.

2026 instead uses the fixed news-informed week arrays, with byes removed. These are single modeling estimates, not promised recovery dates. In particular, Achane's rest-of-season estimate is provisional while imaging is pending. The query shows a single value and player-level contributions, with no uncertainty ranges.

## ADP provenance and limits

[Fantasy Football Calculator](https://fantasyfootballcalculator.com/) provides all ADP values under its [free API attribution terms](https://help.fantasyfootballcalculator.com/article/42-adp-rest-api). The checked-in archive covers 2008–2026. The official 2007 archive currently returns no player records. An FFToday 2007 mirror was found but not used because its provider attribution could not be verified. Historical 2008/2009 lists have anomalous archive end dates in the API; the original metadata is preserved.

2026 live ADP was sparse and already in-season, so the dump instead uses each player's latest standard 12-team chart point between August 25 and September 8, before Week 1. Other FFC format endpoints were used only to discover player IDs; their ADP values are never mixed into this standard-scoring dataset. All player chart dates/URLs are retained. Some injured players have no qualifying ADP in this source and are shown as unscored, not assigned invented values.

`scripts/import-week3-adp.py` deliberately refreshes the 2026 preseason chart extraction using the checked-in historical archive as its starting point. It is an authoring tool, never run by the app. Do not refresh the frozen current injury map automatically.
