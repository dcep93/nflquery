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
    // Frozen September 28, 2026: edit these missed-game weeks in Customize.
    const currentInjuryWeeks = {
        "Justin Jefferson": [],
        "Baker Mayfield": [4, 5],
        "Mike Evans": [4],
        "Puka Nacua": [2, 3],
        "Travis Etienne Jr": [4, 5],
        "Jalen Coker": [],
        "De'Von Achane": [4, 5, 7, 8, 9],
        "Jalen McMillan": [1, 4, 5],
        "Breece Hall": [4],
        "Devin Singletary": [],
        "Adonai Mitchell": [3],
        "Jonah Coleman": [3, 4, 5, 6],
        "Dallas Goedert": [3, 4, 5],
        "Caleb Williams": [3, 4, 5],
        "Alec Pierce": [3, 4, 5, 6, 7],
        "Rico Dowdle": [3, 4],
        "Nico Collins": [2, 3],
        "Caleb Douglas": [3, 4],
        "Tyreek Hill": [],
        "Jaxson Dart": [3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        "Jayden Reed": [3, 4, 5, 6, 7, 8, 9, 10],
        "Jayden Daniels": [3, 4, 5],
        "Jonathon Brooks": [3, 4, 6, 7, 8, 9],
        "De'Zhaun Stribling": [2, 3, 4, 5, 6, 7, 9, 10, 11],
        "Ja'Kobi Lane": [2, 3, 4, 5],
        "Jordan Mason": [2, 3, 4, 5],
        "Dylan Sampson": [2, 3, 4, 5, 6, 7, 8],
        "AJ Brown": [2, 3, 4, 5, 6],
        "Tank Dell": [1, 2, 3, 4, 5, 6],
        "Jordyn Tyson": [1, 2, 3, 4, 5, 6],
        "Zach Charbonnet": [1, 2, 3, 4, 5],
        "Isiah Pacheco": [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
        "Zay Flowers": [2],
        "Brock Bowers": [1, 2],
        "TreVeyon Henderson": [1],
        "Kyler Murray": [2],
        "Sam Darnold": [2],
    };
    const cutoffWeek = 3;
    const cutoffDecay = 35;
    const minDraftWeight = 0.1;
    const adpDecay = 16;
    const durationExponent = 0.8;
    const referenceDraftValue = Math.exp(-10 / adpDecay);
    const referenceInjuryCost = Math.pow(10, durationExponent);
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
        const estimates = new Map(Object.entries(currentInjuryWeeks).map(([name, weeks]) => [
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
            const byeWeeks = new Set();
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
                if (Number.isInteger(byeWeek))
                    byeWeeks.add(byeWeek);
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
                weeks.filter((week) => !schedule.includes(week)).forEach((week) => byeWeeks.add(week));
            }
            if (!weeks.length)
                return;
            // Duration has diminishing returns: 4 weeks is less than twice 2,
            // and 14 weeks is only slightly worse than 12. Normalize so an
            // ADP-10 player missing 10 weeks still contributes exactly 10.
            const draftValue = Math.exp(-player.adp / adpDecay);
            const injuryCost = Math.pow(weeks.length, durationExponent);
            const contribution = 10 * (draftValue / referenceDraftValue) * (injuryCost / referenceInjuryCost);
            score += contribution;
            const ranges = [];
            weeks.forEach((week) => {
                const last = ranges[ranges.length - 1];
                if (last && week === last[1] + 1)
                    last[1] = week;
                else
                    ranges.push([week, week]);
            });
            const weekLabel = (weeks.length === 1 ? "week " : "weeks ") + ranges
                .map(([start, end]) => (start === end ? String(start) : start + "-" + end) + (byeWeeks.has(end) ? "*" : ""))
                .join(", ");
            contributors.push({
                player: player.name,
                adp: player.adp,
                weekLabel,
                contribution,
            });
        });
        contributors.sort((a, b) => b.contribution - a.contribution);
        return {
            x: year,
            y: Number(score.toFixed(3)),
            label: contributors
                .map((p) => \`\${p.player} (ADP \${p.adp}, \${p.weekLabel}) = \${p.contribution.toFixed(3)}\`)
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
        injuryCost: "weeks^durationExponent",
        parameters: { adpDecay, durationExponent },
    }, ...seasons];
}`,
};

export default BuildQueryConfig<TeamAppearance>({
  tooltip:
    "12-team 2-QB ADP (superflex proxy), 2014–2026. How injury prone did the season appear after week 3? Assume we had perfect knowledge of injuries suffered before week 4.",
  queryFunctions: () => evalFunctions(source) as QueryFunctions<TeamAppearance>,
});
