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
  extract: `({ d, g, teamIndex }) => g.week > 0
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
    const decayPicks = 35;
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
    return years.map((year) => {
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
        const unresolved = [];
        const contributors = [];
        let score = 0;
        adpPlayers.forEach((player) => {
            const key = normalizeName(player.name);
            const draftTeam = normalizeTeam(player.team || "");
            let team = draftTeam;
            let weeks = [];
            let basis = "estimated";
            if (current) {
                weeks = Array.from(new Set(estimates.get(key) || []))
                    .filter((week) => Number.isInteger(week) && week > cutoffWeek && week <= 18)
                    .sort((a, b) => a - b);
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
                if (!schedule) {
                    unresolved.push(\`\${player.name}: no matching team schedule\`);
                    return;
                }
                // Only the uninterrupted absence at the Week 3 boundary counts.
                // A Week 3 participant missing the next game captures in-game exits.
                // It may also capture injuries sustained in practice before Week 4.
                const nextGames = schedule.filter((week) => week > cutoffWeek);
                // A return for a different team also ends the stretch, even if the
                // original team has its bye that week.
                const returnWeek = Math.min(Infinity, ...seen.filter((a) => a.week > cutoffWeek).map((a) => a.week));
                weeks = nextGames.filter((week) => week < returnWeek);
                basis = seen.length
                    ? "box-score absence stretch"
                    : "no season appearance; cause unknown";
            }
            if (!weeks.length)
                return;
            const weight = Math.exp(-(player.adp - 1) / decayPicks);
            const contribution = weight * weeks.length;
            score += contribution;
            contributors.push({
                player: player.name,
                adp: player.adp,
                team,
                missedWeeks: weeks,
                draftWeight: Number(weight.toFixed(4)),
                contribution: Number(contribution.toFixed(3)),
                basis,
            });
        });
        if (current) {
            Object.keys(H.CURRENT_INJURY_WEEKS).forEach((name) => {
                if (!adpPlayers.some((p) => normalizeName(p.name) === normalizeName(name))) {
                    unresolved.push(\`\${name}: absent from ADP source; unscored\`);
                }
            });
        }
        contributors.sort((a, b) => b.contribution - a.contribution);
        return {
            x: year,
            y: Number(score.toFixed(3)),
            label: \`\${year}: \${current ? \`estimate as of \${H.CURRENT_INJURY_SOURCES.asOf}\` : "historical box-score absence proxy"}; \` +
                contributors
                    .map((p) => \`\${p.player} (ADP \${p.adp}, weeks \${p.missedWeeks.join(",")}) = \${p.contribution}\`)
                    .join("; "),
            formula: \`sum(exp(-(ADP - 1) / \${decayPicks}) * missed games after Week \${cutoffWeek})\`,
            mode: current ? "estimate" : "observed absence proxy",
            players: contributors,
            unscored: unresolved,
            adpSource: "Fantasy Football Calculator, standard 12-team; QueryHelpers.ADP_SOURCES",
            caveat: current
                ? "Fixed point estimates, not guaranteed return dates. Sources: QueryHelpers.CURRENT_INJURY_SOURCES."
                : "Box-score gaps are inferred absences, not confirmed injuries. Includes non-injury absences; no historical forecasts. Byes/postseason excluded. Stops at first return; later injuries excluded.",
        };
    });
}`,
};

export default BuildQueryConfig<TeamAppearance>({
  tooltip:
    "Week 3 injury burden: preseason ADP × remaining missed games. Historical absences inferred from NFLQuery box scores; 2026 is a fixed news-informed estimate. Higher = worse. Full calculation is editable; static data lives in window.QueryHelpers. Absences can include benchings/suspensions and Week 4 practice injuries.",
  queryFunctions: () => evalFunctions(source) as QueryFunctions<TeamAppearance>,
});
