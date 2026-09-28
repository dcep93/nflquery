import {
  BuildQueryConfig,
  evalFunctions,
  QueryFunctions,
} from "../QueryBuilder";

type TeamAppearance = {
  year: number;
  week: number;
  team: string;
  gameId: number;
  players: string[];
};

// Keep the executable source as text so production minification cannot rename
// variables or inject closure helpers into the editable query. The dropdown and
// Customize use this same complete source; only datasets live in QueryHelpers.
const source = {
  extract: `({ d, g, teamIndex }) => Number.isInteger(g.week) && g.week >= 1 && g.week <= 18
    ? [
        {
            year: d.year,
            week: g.week,
            team: g.teams[teamIndex].name,
            gameId: g.gameId,
            // Offensive/kicking appearances count even with zero fantasy
            // points. Exclude defensive homonyms (e.g. safety Michael Thomas).
            players: Array.from(new Set(g.teams[teamIndex].boxScore.flatMap((category) => [
                "passing",
                "rushing",
                "receiving",
                "kicking",
                "kickReturns",
                "puntReturns",
            ].includes(category.category)
                ? category.players.map((player) => player.name)
                : []))),
        },
    ]
    : []`,
  mapPoints: `(points) => {
    // These constants and ALL scoring/inference below remain in this textbox.
    const cutoffWeek = 3;
    const cutoffDecay = 35;
    const minDraftWeight = 0.1;
    const adpDecay = 16;
    const durationScale = 10;
    const referenceDraftValue = Math.exp(-10 / adpDecay);
    const referenceInjuryCost = 1 - Math.exp(-10 / durationScale);
    const H = window.QueryHelpers;
    const currentYear = H.CURRENT_INJURY_SOURCES.year;
    const normalizeName = (name) => {
        const key = name
            .toLowerCase()
            .replace(/\\s+(jr\\.?|sr\\.?|ii|iii|iv|v)$/, "")
            .replace(/[^a-z0-9]/g, "");
        return H.NFL_PLAYER_ALIASES[key] || key;
    };
    const normalizeTeam = (team) => H.NFL_TEAM_ALIASES[team] || team;
    const gamesByYear = new Map();
    points.forEach(({ extraction }) => {
        const games = gamesByYear.get(extraction.year) || [];
        games.push({ ...extraction, team: normalizeTeam(extraction.team) });
        gamesByYear.set(extraction.year, games);
    });
    const years = Array.from(new Set([...Array.from(gamesByYear.keys()), currentYear]))
        .filter((year) => H.ADP_BY_YEAR[year]?.length)
        .sort((a, b) => a - b);
    const seasons = years.map((year) => {
        const current = year === currentYear;
        const games = gamesByYear.get(year) || [];
        const adpPlayers = H.ADP_BY_YEAR[year].filter((p) => ["QB", "RB", "WR", "TE", "PK", "K"].includes(p.position));
        const schedules = new Map();
        const appearances = new Map();
        games.forEach((game) => {
            const schedule = schedules.get(game.team) || [];
            schedule.push(game.week);
            schedules.set(game.team, schedule);
            game.players.forEach((name) => {
                const key = normalizeName(name);
                const entries = appearances.get(key) || [];
                entries.push({ team: game.team, week: game.week });
                appearances.set(key, entries);
            });
        });
        schedules.forEach((weeks, team) => schedules.set(team, Array.from(new Set(weeks)).sort((a, b) => a - b)));
        const estimates = new Map(Object.entries(H.CURRENT_INJURY_WEEKS).map(([name, weeks]) => [
            normalizeName(name),
            weeks,
        ]));
        const currentInjuries = new Map(Object.entries(H.CURRENT_INJURY_SOURCES.players).map(([name, injury]) => [
            normalizeName(name),
            injury,
        ]));
        const contributors = [];
        let score = 0;
        adpPlayers.forEach((player) => {
            // Keep eligibility independent of the customizable scoring curve.
            if (!Number.isFinite(player.adp))
                return;
            const draftWeight = Math.exp(-(player.adp - 1) / cutoffDecay);
            if (draftWeight < minDraftWeight)
                return;
            const key = normalizeName(player.name);
            const draftTeam = normalizeTeam(player.team || "");
            let team = draftTeam;
            let weeks = [];
            if (current) {
                // This authoritative map includes observed Weeks 1–3 and estimates.
                weeks = Array.from(new Set(estimates.get(key) || []))
                    .filter((week) => Number.isInteger(week) && week >= 1 && week <= 18)
                    .sort((a, b) => a - b);
                // The static list records missed games. Include an adjacent bye
                // only when the existing return estimate still places it inside
                // that injury absence; healthy players gain no bye-only burden.
                const injury = currentInjuries.get(key);
                const byeWeek = injury?.byeWeek;
                if (Number.isInteger(byeWeek) && byeWeek >= 1 && byeWeek <= 18
                    && byeWeek < (injury.estimatedReturnWeek ?? 19)
                    && weeks.some((week) => Math.abs(week - byeWeek) === 1))
                    weeks = Array.from(new Set([...weeks, byeWeek])).sort((a, b) => a - b);
            }
            else {
                let seen = appearances.get(key) || [];
                // Same-name players (e.g. the two Steve Smiths) need their ADP team.
                const sameNamePlayers = adpPlayers.filter((p) => normalizeName(p.name) === key);
                if (sameNamePlayers.length > 1)
                    seen = seen.filter((a) => a.team === draftTeam);
                const early = seen
                    .filter((a) => a.week <= cutoffWeek)
                    .sort((a, b) => b.week - a.week);
                const later = seen.slice().sort((a, b) => a.week - b.week);
                // Historical FFC team fields sometimes reflect a later trade.
                team = early[0]?.team || later[0]?.team || draftTeam;
                const schedule = schedules.get(team);
                if (!schedule)
                    return;
                // Count all missed scheduled games in Weeks 1–3, including gaps
                // followed by an early return. Then add only the uninterrupted
                // absence after Week 3. A Week 3 exit can miss the next game.
                // A return anywhere ends that stretch, even during the old team's
                // bye. Later new injuries do not count.
                const firstReturnAfter3 = Math.min(Infinity, ...seen.filter((a) => a.week > cutoffWeek).map((a) => a.week));
                const missedGames = schedule.filter((week) => week <= cutoffWeek
                    ? !seen.some((a) => a.week === week)
                    : week < firstReturnAfter3);
                // Once a missed game establishes an injury absence, count its
                // calendar weeks through the next appearance, including byes.
                // Start the post-cutoff stretch at Week 4 (possibly a bye), but
                // do not invent leading weeks absent from partial season data.
                const injuryWeeks = new Set();
                const seasonEnd = Math.max(...schedule) + 1;
                missedGames.forEach((missedWeek) => {
                    const start = missedWeek <= cutoffWeek
                        ? missedWeek
                        : Math.max(cutoffWeek + 1, schedule[0]);
                    const end = Math.min(seasonEnd, ...seen.filter((a) => a.week > missedWeek).map((a) => a.week));
                    for (let week = start; week < end; week++)
                        injuryWeeks.add(week);
                });
                weeks = Array.from(injuryWeeks).sort((a, b) => a - b);
            }
            if (!weeks.length)
                return;
            // Duration has diminishing returns: 4 weeks is less than twice 2,
            // and 14 weeks is only slightly worse than 12. Normalize so an
            // ADP-10 player missing 10 weeks still contributes exactly 10.
            const draftValue = Math.exp(-player.adp / adpDecay);
            const injuryCost = 1 - Math.exp(-weeks.length / durationScale);
            const contribution = 10 * (draftValue / referenceDraftValue) * (injuryCost / referenceInjuryCost);
            score += contribution;
            contributors.push({
                player: player.name,
                adp: player.adp,
                missedWeeks: weeks,
                contribution,
            });
        });
        contributors.sort((a, b) => b.contribution - a.contribution);
        return {
            x: year,
            y: Number(score.toFixed(3)),
            label: contributors
                .map((p) => \`\${p.player} (ADP \${p.adp}, \${p.missedWeeks.length} \${p.missedWeeks.length === 1 ? "week" : "weeks"}) = \${p.contribution.toFixed(3)}\`)
                .join("\\n"),
        };
    });
    // A finite maximum keeps this formula header first after sorting and
    // preserves its y value when the results are serialized as JSON.
    return [{
        x: "",
        y: Number.MAX_VALUE,
        label: "",
        formula: "sum(10 × draftValue(ADP) / draftValue(10) × injuryCost(weeks) / injuryCost(10))",
        draftValue: "exp(-ADP / adpDecay)",
        injuryCost: "1 - exp(-weeks / durationScale)",
        parameters: { adpDecay, durationScale },
    }, ...seasons];
}`,
};

export default BuildQueryConfig<TeamAppearance>({
  tooltip:
    "12-team 2-QB ADP (superflex proxy), 2014–2026. How injury prone did the season appear after week 3? Assume we had perfect knowledge of injuries suffered before week 4.",
  queryFunctions: () => evalFunctions(source) as QueryFunctions<TeamAppearance>,
});
