# Week 3 injury-year query data

`WEEK_3_INJURY_YEARS` is a permanent NFLQuery dropdown query. Select it, inspect or edit the extract/mapPoints textboxes, then click Customize. The entire inference and scoring algorithm is in those functions; there is no hidden scoring helper.

## Variables available to custom queries

- `window.QueryHelpers.ADP_BY_YEAR`: year → raw Fantasy Football Calculator 12-team standard (Non-PPR) player list, 2008–2026, with name, position, team, numeric standard ADP and bye.
- `window.QueryHelpers.CURRENT_INJURY_WEEKS`: player → complete injury-missed regular-season week numbers: known Weeks 1–3 absences plus estimated future absences. Frozen September 28, 2026 before Week 3 Monday Night Football. Empty arrays mean no full-game injury absences included in the snapshot.
- `window.QueryHelpers.CURRENT_INJURY_SOURCES`: snapshot date and per-player evidence/rationale, including team, bye and return-week assumptions.
- `window.QueryHelpers.ADP_CONVERSION`: frozen position-specific multipliers/exponents, fit provenance, and held-out-year validation. The calculation applies these to every year.
- `window.QueryHelpers.ADP_SOURCES`: provider, original archive metadata, retrieval date, per-player 2026 chart URLs/dates and known gaps.
- `window.QueryHelpers.NFL_PLAYER_ALIASES` and `NFL_TEAM_ALIASES`: static identity mappings.

No fantasy420 data, code, rosters, draft boards, or network requests are used.

## Score

```javascript
// Convert every raw standard ADP with the same frozen positional coefficients.
const { multiplier, exponent } = window.QueryHelpers.ADP_CONVERSION.positions[position];
const adp = Math.max(1, multiplier * Math.pow(standardADP, exponent));
const adpDecay = 16;
const durationExponent = 0.8;
const draftWeight = Math.exp(-(adp - 1) / 35);
if (draftWeight < 0.1) return; // unchanged eligibility cutoff, approximately ADP > 81.59
const draftValue = Math.exp(-adp / adpDecay);
const referenceDraftValue = Math.exp(-10 / adpDecay);
const injuryCost = Math.pow(missedWeeks.length, durationExponent);
const referenceInjuryCost = Math.pow(10, durationExponent);
const contribution = 10 * (draftValue / referenceDraftValue) * (injuryCost / referenceInjuryCost);
```

Converted ADP 10 injured for 10 full weeks scores exactly 10, including byes within an injury absence. The benchmark stays fixed even when the two scoring parameters are edited. Labels show converted ADP rounded to three decimals; scoring and the cutoff use its full precision. Raw standard ADP stays available in QueryHelpers. ADP scoring uses a steeper decay of 16; the separate eligibility cutoff stays unchanged. Duration uses a power curve, `weeks^durationExponent`, with diminishing returns and no fixed ceiling. Sixteen weeks score about 3.03 times four, nine weeks about 60% more than five, and fourteen about 13% more than twelve. Nick Chubb at ADP 14.1 for sixteen weeks contributes 11.272; Austin Ekeler at ADP 9.1 for four contributes 5.082. The draft cutoff applies before duration or normalization, so a late pick cannot qualify through a longer injury absence. Adding another season never rescales existing scores.

For example, Puka Nacua's 2024 appearance in Week 1 and return in Week 8 give six absent weeks (2–7), including the Week 6 bye.

For completed seasons, NFLQuery's own box scores establish appearances. Any offensive or kicking/return appearance counts regardless of fantasy points; defensive categories are excluded to avoid namesake collisions. Count every missed scheduled game in Weeks 1–3, including an early absence for a player who has already returned. Add the uninterrupted absence after Week 3 up to the first later appearance, including a return for a different team. A player who plays Week 4 can still contribute missed Weeks 1–3, but later injuries contribute nothing. Once an absence is established, count every week through the week before the next appearance, including intervening byes. A continuous post-Week-3 absence starts at Week 4, including a Week 4 bye if the next scheduled game is missed. A healthy bye alone adds nothing. Bound duration to the regular season; extraction excludes postseason. Historical ADP team labels can reflect later trades; actual appearances take precedence.

Historical results are a **box-score absence proxy**, not a medical injury registry. Gaps can include benchings, suspensions, holdouts, zero-stat appearances and injuries sustained between Week 3 and the next scheduled game. No historical news or forecasts are used. Players without an identifiable schedule or ADP are skipped.

2026 uses the fixed, reviewed injury-week map instead. Current-season box scores and current reports establish early missed games; news informs one future-return estimate per injury. A confirmed Week 3 inactive can be included before that game is played. Actual participation, even for part of a game, is not a fully missed game. Healthy scratches, unsigned free-agent weeks and known non-injury exclusions are not counted. The raw week map still records missed games. The editable calculation also counts the saved bye week when it is adjacent to an injury-missed week and precedes the saved return week. This includes a bye immediately before the estimated return. The source metadata separates reported facts, known absences, future estimates and modeling assumptions. Unknown diagnoses still require provisional point estimates; no uncertainty ranges are displayed.

The first output point is a formula entry: empty `x` and `label`, `y: Number.MAX_VALUE` to sort first, and a human-readable `formula` string. Symbolic `draftValue` and `injuryCost` definitions accompany a separate `parameters` object containing `adpDecay` and `durationExponent`. The maximum is a finite sorting sentinel, not a season score, and survives JSON serialization. The formula entry is excluded from ranks, result counts, and the 100-result display limit; the highest-scoring season starts at #1. Each season point contains only `x`, `y`, and `label`. Season labels contain one player per line, in descending contribution order. The results renderer displays coordinates and labels as text, preserves label line breaks, and shows extra fields such as `formula` in a JSON `<pre>` block. Season labels show consecutive missed-week ranges, such as `Adrian Peterson (ADP 6.6, weeks 1-10) = 12.368`. Separate absences are comma-separated (for example, `weeks 1-2, 4-6*`); a single week is `week 4`. A `*` marks a range ending on a bye, inferred from historical team schedules or the saved current-year bye metadata. Interior byes still count but do not add a suffix. Detailed sources remain available through QueryHelpers and are not included in output labels.

## ADP provenance and limits

[Fantasy Football Calculator](https://fantasyfootballcalculator.com/adp/standard) supplies all raw ADP under its [free API attribution terms](https://help.fantasyfootballcalculator.com/article/42-adp-rest-api). Every season uses 12-team **standard (Non-PPR)** ADP, converted to an estimated 2-QB value as the approved superflex proxy. No actual 2-QB player ADP is mixed into the query inputs in overlapping years.

The raw dump covers **2008–2026**. The 2007 endpoint has metadata but no players; pre-2007 requests are rejected. FFC explicitly labels the 2008 and 2009 pages as those archived seasons and their lists match the API, but both report an inconsistent 2010-06-20 end date. This unresolved archive-date caveat is preserved in the source metadata; their preseason timing is not independently verified. Later archives retain their reported date windows verbatim.

The same fixed conversion is applied inside editable `mapPoints` to QB/RB/WR/TE in every year:

`convertedADP = max(1, multiplier[position] × standardADP^exponent[position])`

`adp-conversion.json` stores full-precision coefficients, source URLs and validation. They were fitted using log/log least squares on 1,913 matched player-seasons in FFC standard and 2-QB data from 2014–2025. The 2-QB observations are calibration targets only. Coefficients never refit automatically or vary by season. Unsupported positions remain in the raw dump but do not score. Leave-one-year-out checks found mean absolute ADP errors of 2.89 picks among actual top-20 players and 5.71 among actual top-82 players; matched-player season scores differed by 11.3% on average and up to 31.5%. These are exploratory validation results, not a guarantee for earlier eras. The formula header shows the conversion and its coefficients alongside the unchanged injury scoring formula.

2026 live standard ADP includes in-season drafts, so the dump uses each player's latest **standard** chart point between August 25 and September 8, before Week 1. The 2025 and 2026 standard archive lists supply player identities. Each included player's chart date, URL and raw ADP is retained. Daily chart sample sizes are unavailable. Missing standard ADP is not invented or replaced with another format. The frozen injury weeks remain unchanged; only their missing-ADP coverage metadata is refreshed.

`scripts/import-week3-adp.py` rebuilds the static standard archive and 2026 preseason charts. It validates format/team-count metadata, rejects invalid ADP, and aborts on fetch errors or insufficient current coverage before writing the dump. Optional `--cache-dir /path/to/cache` saves public responses for reproducible reruns. This is an authoring tool, never run by the app. It does not refit the conversion or update injury estimates.
