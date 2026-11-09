# March and Comeback correctness

Approved by the user with `yesi` on November 8, 2026.

## Behavior

March ranks net field position gained on the possession that takes the eventual winner from trailing or tied to a lead it never relinquishes. It measures from the first offensive play (including enforced penalties) through the touchdown or through the last play before a successful field goal. Kick distance, kick returns, extra points, and administrative markers do not count as offensive advancement. Include penalty yardage as net field position, not individual-player offensive statistics. Display the start clock explicitly as time remaining, starting field position, net yards, and starting/ending score. Regulation possessions only; a clock at zero may still represent an untimed down. This is not a duration leaderboard or an all-history assertion.

Comeback ranks deficits established by opponent scoring, including the conversion, followed by an eventual win (which may occur in overtime). Pair the resulting score with the clock after that scoring sequence, never a later drive's clock. Scores use explicit team names. A team reducing its own deficit, or an opponent's nonscoring drive, does not establish a new candidate. Rank regulation scoring events only, so overtime clock lengths do not distort the comparison.

For both reports, show the frontier: keep candidates for which no other has at least as many yards/deficit and at most as much regulation time remaining, with one strict advantage. Preserve exact ties. Show dominated candidates in expandable readable lists with an accurate count; avoid the misleading comma-concatenated labels and “more but slower.”

## Evidence and incomplete records

Atlanta vs Chicago 2008 week 6: start Q4 0:06, own 44, 26 net yards, field goal, final CHI 20 / ATL 22. Buffalo at Washington 2007 week 13: Washington established BUF 5 / WSH 16 at Q3 5:42; Buffalo made it 8–16 at Q3 1:09. The interception labeled Q4 0:26 must be Q3 0:26. A second bad drive contains [14,16] at halftime instead of [2,9] and a Q4 kickoff instead of Q2.

Source: https://static.www.nfl.com/image/upload/v1677631535/gamecenter/10012007-1202-095d-863f-eb38460fa7a3.pdf (scoring summary and third-quarter play-by-play). Apply narrowly matched, immutable corrections at the loading/analysis boundary so existing browser caches and future fetches also benefit. Keep provenance with the correction. Do not rewrite large season JSON files or guess corrections for other games.

Validate monotonic scores against the final score, candidate clock order, score changes and field position. Flag and exclude ambiguous records with readable reasons. Missing post-score timing must not silently become a pre-snap clock: prefer conversion/kickoff clocks, reliable explicit drive end metadata when present, or a same-clock post-score marker. Surface excluded-game counts/details. The result covers the loaded seasons and trustworthy available records, not all NFL history.

## Implementation and verification

Put reusable correction, event extraction, and frontier logic in a focused helper module exposed through window.QueryHelpers; the editable query functions must continue to work after serialization/eval. Keep changes scoped to March/Comeback, their data correction hook, and structured report rendering. Preserve other queries' output and behavior.

Regression tests must cover the two real games, post-score vs pre-snap clocks, opponent scoring vs winner scoring, defensive scores, field goals and holder coordinates, kickoff/period/timeout exclusion, penalties, tied starts, overtime finishes, exact frontier ties, invalid scores/clocks, and serialized Customize functions. Run the Jest suite, type check, production build, and a whole-dataset audit. Review resulting cards visually. Commit and push task-owned changes on main per workspace instructions.
