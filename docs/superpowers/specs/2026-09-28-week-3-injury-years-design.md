# Week 3 injury years — revised September 28, 2026

The permanent WEEK_3_INJURY_YEARS dropdown uses only NFLQuery data_v6 for historical appearances/schedules and one provider, Fantasy Football Calculator 12-team 2-QB (the user-approved superflex proxy), for static ADP2014–2026. No fantasy420 dependency. No historical injury news or forecasts.

The full extraction, inference and scoring code remains readable and editable in the textboxes after production minification. QueryHelpers exposes static ADP, injury week map and source metadata only.

Historical missed games are every scheduled absence in Weeks1–3 plus the uninterrupted absence afterWeek3 ending at the first return. Count early absences even if a player returns beforeWeek3. A player participating in the first scheduled postWeek3 game adds no future absence. Week4 bye means Week5 is the next scheduled game. Later injuries are excluded. Use offensive/kicking/return categories; exclude defensive namesakes. Normalize player/team aliases, prioritize observed teams over stale ADP metadata, and skip unresolved schedules. These remain absence proxies, not confirmed injury diagnoses.

For2026 independently review all34 original names against current reporting, include confirmed early injury absences, and add other ADP-eligible early injury absences found in NFLQuery. Full-game misses only; no healthy scratches, unsigned free-agent games or known non-injury exclusions. Store one player:weekNum[] map containing known early absences and estimated future weeks. Separate facts and assumptions in metadata, preserve dated source links, honor byes and IR game eligibility. No uncertainty ranges.

Raw draftWeight=exp(-(ADP-1)/35). Exclude weight<0.1 before considering absence duration. Contribution=weight/exp(-(10-1)/35)*missedGames. Thus ADP10 for10missedgames=10 without changing which players qualify. Return only x(year), y(sum rounded3decimals), label(player ADP, count of weeks, contribution3decimals; descending). No bulky metadata in output.

Validate historical early returns, ongoing absences, Week3 exits, Week4 byes, later injuries excluded, trades, namesakes, current full week map, cutoff independent ofduration, normalizedscale, minimaloutput and Customize serialization. Refresh completed2026 games using existing NFLQuery ingestion. Run focusedtests, TypeScript, productionbuild, independent spec/code review and browser checks. Commit task-owned changes and deploy main as requested.

ADP format revision: The user explicitly chose FFC 2-QB as a proxy rather than requiring actual superflex observations. Only populated 2-QB years2014–2026 are included;2007–2013 are unavailable. For2026 use preseason2-QB chart values throughSeptember8, never the live in-season ADP. Preserve frozen injury weeks and all scoring/output behavior. Record the format distinction in metadata, README and tooltip.
