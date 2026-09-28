# Week 3 injury-year query data

`WEEK_3_INJURY_YEARS` is a permanent NFLQuery dropdown query. Select it, inspect or edit the extract/mapPoints textboxes, then click Customize. The entire inference and scoring algorithm is in those functions; there is no hidden scoring helper.

## Variables available to custom queries

- `window.QueryHelpers.ADP_BY_YEAR`: year → Fantasy Football Calculator 12-team 2-QB player list (the approved superflex proxy) with name, position, team, numeric ADP and bye.
- `window.QueryHelpers.CURRENT_INJURY_WEEKS`: player → complete injury-missed regular-season week numbers: known Weeks 1–3 absences plus estimated future absences. Frozen September 28, 2026 before Week 3 Monday Night Football. Empty arrays mean no full-game injury absences included in the snapshot.
- `window.QueryHelpers.CURRENT_INJURY_SOURCES`: snapshot date and per-player evidence/rationale, including team, bye and return-week assumptions.
- `window.QueryHelpers.ADP_SOURCES`: provider, original archive metadata, retrieval date, per-player 2026 chart URLs/dates and known gaps.
- `window.QueryHelpers.NFL_PLAYER_ALIASES` and `NFL_TEAM_ALIASES`: static identity mappings.

No fantasy420 data, code, rosters, draft boards, or network requests are used.

## Score

```javascript
const adpDecay = 16;
const durationScale = 10;
const draftWeight = Math.exp(-(adp - 1) / 35);
if (draftWeight < 0.1) return; // unchanged eligibility cutoff, approximately ADP > 81.59
const draftValue = Math.exp(-adp / adpDecay);
const referenceDraftValue = Math.exp(-10 / adpDecay);
const injuryCost = 1 - Math.exp(-missedWeeks.length / durationScale);
const referenceInjuryCost = 1 - Math.exp(-10 / durationScale);
const contribution = 10 * (draftValue / referenceDraftValue) * (injuryCost / referenceInjuryCost);
```

ADP 10 injured for 10 full weeks scores exactly 10, including byes within an injury absence. The benchmark stays fixed even when the two scoring parameters are edited. ADP scoring uses a steeper decay of 16; the separate eligibility cutoff stays unchanged. Duration has diminishing impact without flattening too early: nine weeks score about 51% more than five, while fourteen score about 8% more than twelve. CMC at ADP 2.7 for nine weeks contributes 14.816; Tua at ADP 16.4 for five contributes 4.172. The draft cutoff applies before duration or normalization, so a late pick cannot qualify through a longer injury absence. Adding another season never rescales existing scores.

For example, Puka Nacua's 2024 appearance in Week 1 and return in Week 8 give six absent weeks (2–7), including the Week 6 bye.

For completed seasons, NFLQuery's own box scores establish appearances. Any offensive or kicking/return appearance counts regardless of fantasy points; defensive categories are excluded to avoid namesake collisions. Count every missed scheduled game in Weeks 1–3, including an early absence for a player who has already returned. Add the uninterrupted absence after Week 3 up to the first later appearance, including a return for a different team. A player who plays Week 4 can still contribute missed Weeks 1–3, but later injuries contribute nothing. Once an absence is established, count every week through the week before the next appearance, including intervening byes. A continuous post-Week-3 absence starts at Week 4, including a Week 4 bye if the next scheduled game is missed. A healthy bye alone adds nothing. Bound duration to the regular season; extraction excludes postseason. Historical ADP team labels can reflect later trades; actual appearances take precedence.

Historical results are a **box-score absence proxy**, not a medical injury registry. Gaps can include benchings, suspensions, holdouts, zero-stat appearances and injuries sustained between Week 3 and the next scheduled game. No historical news or forecasts are used. Players without an identifiable schedule or ADP are skipped.

2026 uses the fixed, reviewed injury-week map instead. Current-season box scores and current reports establish early missed games; news informs one future-return estimate per injury. A confirmed Week 3 inactive can be included before that game is played. Actual participation, even for part of a game, is not a fully missed game. Healthy scratches, unsigned free-agent weeks and known non-injury exclusions are not counted. The raw week map still records missed games. The editable calculation also counts the saved bye week when it is adjacent to an injury-missed week and precedes the saved return week. This includes a bye immediately before the estimated return. The source metadata separates reported facts, known absences, future estimates and modeling assumptions. Unknown diagnoses still require provisional point estimates; no uncertainty ranges are displayed.

The first output point is a formula entry: empty `x` and `label`, `y: Number.MAX_VALUE` to sort first, and a human-readable `formula` string. Symbolic `draftValue` and `injuryCost` definitions accompany a separate `parameters` object containing `adpDecay` and `durationScale`. The maximum is a finite sorting sentinel, not a season score, and survives JSON serialization. The formula entry is excluded from ranks, result counts, and the 100-result display limit; the highest-scoring season starts at #1. Each season point contains only `x`, `y`, and `label`. Season labels contain one player per line, in descending contribution order. The results renderer displays coordinates and labels as text, preserves label line breaks, and shows extra fields such as `formula` in a JSON `<pre>` block. Season labels contain contributions such as `Adrian Peterson (ADP 6.6, 10 weeks) = 12.368`. Detailed sources remain available through QueryHelpers and are not included in output labels.

## ADP provenance and limits

[Fantasy Football Calculator](https://fantasyfootballcalculator.com/adp/2qb) supplies all ADP under its [free API attribution terms](https://help.fantasyfootballcalculator.com/article/42-adp-rest-api). The provider calls this format **2-QB**, not superflex. The user approved it as a superflex proxy; a mandatory second QB and an optional superflex slot are not identical formats.

The checked-in 12-team 2-QB archive covers **2014–2026**. The official 2007–2013 2-QB endpoints return no data. Their responses are recorded in the source metadata, and those years are excluded rather than mixing in standard ADP. All populated historical archives identify their format as `2 QB` and end before that season's opener.

2026 live ADP already includes in-season drafts, so the dump instead uses each player's latest **2-QB** chart point between August 25 and September 8, before Week 1. Other FFC format endpoints discover player identities only; their ADP values are never used. Each included player's chart date, URL and value is retained. Daily chart sample sizes are unavailable. Some injured players have no qualifying ADP; they remain in the injury snapshot but do not score. The injury source metadata lists missing ADP names without adding them to the query output. No invented ADP values are assigned.

`scripts/import-week3-adp.py` rebuilds the static 2-QB archive and 2026 preseason charts. It validates the provider's format/team-count metadata, rejects invalid ADP, and aborts on fetch errors or insufficient current coverage before writing the dump. Optional `--cache-dir /path/to/cache` saves public responses for reproducible reruns. This is an authoring tool, never run by the app. Do not refresh the frozen injury estimates automatically when changing ADP format.
