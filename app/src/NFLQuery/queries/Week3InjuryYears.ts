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
    const decayPicks = 35;
    const minDraftWeight = 0.1;
    const referenceWeight = Math.exp(-(10 - 1) / decayPicks);
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
        const contributors = [];
        let score = 0;
        adpPlayers.forEach((player) => {
            // Cut off tiny draft weights BEFORE duration or ADP-10 normalization.
            if (!Number.isFinite(player.adp))
                return;
            const draftWeight = Math.exp(-(player.adp - 1) / decayPicks);
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
                // bye. Later new injuries do not count; schedules exclude byes.
                const firstReturnAfter3 = Math.min(Infinity, ...seen.filter((a) => a.week > cutoffWeek).map((a) => a.week));
                weeks = schedule.filter((week) => week <= cutoffWeek
                    ? !seen.some((a) => a.week === week)
                    : week < firstReturnAfter3);
            }
            if (!weeks.length)
                return;
            // An ADP-10 player missing 10 games contributes exactly 10.
            const contribution = (draftWeight / referenceWeight) * weeks.length;
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
                .join("; "),
        };
    });
}`,
};

export default BuildQueryConfig<TeamAppearance>({
  tooltip:
    "12-team 2-QB ADP (superflex proxy), 2014–2026. Week 3 injury burden: ADP-weighted missed games in Weeks 1–3 plus continuous absence after Week 3. ADP 10 missing 10 games = 10; raw draft weights below 0.1 are excluded. Historical box-score absences are a proxy and can include non-injury causes; 2026 uses fixed observed/estimated weeks. Higher = worse. Full calculation is editable; static data lives in window.QueryHelpers.",
  queryFunctions: () => evalFunctions(source) as QueryFunctions<TeamAppearance>,
});
