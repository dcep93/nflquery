import type { GameType, PlayType, DriveType } from "./types";
import type { PointInType, PointType } from "./Query";
import { correctGameData } from "./dataCorrections";

export type LateGameMode = "march" | "comeback";
export type LateGameCandidate = {
  value: number;
  remainingSeconds: number;
  clock: string;
  description: string;
  startYardsToEndzone?: number;
};
export type LateGameAnalysis = {
  gameId: number;
  year: number;
  mode: LateGameMode;
  candidates: LateGameCandidate[];
  exclusions: string[];
};
export type LateGameReport = {
  title: string;
  definition: string;
  scope: string;
  gamesAnalyzed: number;
  excludedGames: number;
  exclusions: { label: string; reasons: string[] }[];
  dominated: { x: string; y: number; label: string }[];
};

type Clock = { quarter: number; remaining: number };
function parseClock(clock: string): Clock | null {
  const match = /^Q([1-9]\d*) (\d{1,2}):([0-5]\d)$/.exec(clock ?? "");
  if (!match) return null;
  const quarter = Number(match[1]);
  const seconds = Number(match[2]) * 60 + Number(match[3]);
  if (seconds > 900) return null;
  return { quarter, remaining: (4 - quarter) * 900 + seconds };
}
function timelineError(plays: PlayType[]): string | null {
  let previous = Infinity;
  for (const play of plays) {
    const clock = parseClock(play.clock);
    if (!clock) return `Invalid clock ${JSON.stringify(play.clock)}.`;
    if (clock.remaining > previous)
      return `Clock moves backward at ${play.clock}.`;
    previous = clock.remaining;
  }
  return null;
}
function scoreError(game: GameType): string | null {
  const valid = (scores: number[]) =>
    Array.isArray(scores) &&
    scores.length === 2 &&
    scores.every((s) => Number.isInteger(s) && s >= 0);
  if (!valid(game.scores)) return "Invalid final score.";
  if (!game.drives.length) return "Missing drive scores.";
  let previous = [0, 0];
  for (let i = 0; i < game.drives.length; i++) {
    const drive = game.drives[i];
    const priorScores = previous;
    if (
      !valid(drive.scores) ||
      drive.scores.some(
        (s, team) => s < priorScores[team] || s > game.scores[team],
      )
    )
      return `Invalid score chronology at drive ${i + 1}.`;
    previous = drive.scores;
  }
  return previous.some((s, team) => s !== game.scores[team])
    ? "Last drive score disagrees with final score."
    : null;
}
const conversion = (play: PlayType) =>
  /^(XP|XPM|EPM|_BlockedPat|2PT|2PTC|2PC|PAT|PAT2|_?TwoPointPass|_?TwoPointRush|D2P)$/i.test(
    play.type,
  ) ||
  (play.type !== "TD" &&
    /extra point|two.point (conversion|attempt)|2.point (conversion|attempt)/i.test(
      play.text,
    ));
const kickoff = (play: PlayType) =>
  /^(K|_KickoffReturnOff|Kickoff)$/i.test(play.type) ||
  /\bkicks (?:onside )?\d+ yards from\b/i.test(play.text);
const administrative = (play: PlayType) =>
  /^(EP|EH|EG|ER|_CoinToss|TO|Off TO|2Min Warn)$/i.test(play.type) ||
  /^(start of|end of|END (QUARTER|GAME)|two.minute warning|timeout)/i.test(
    play.text,
  );
const nonOffensiveScore = (play: PlayType) =>
  /^(INT|INTR|PUNT|_PuntReturn|BP|BFG|_MuffedPuntRecoveryOpp|K|SF|SFOP|_FumbleRecoveryOpp)$/i.test(
    play.type,
  ) ||
  /\b(punts?|kickoff|kick return|punt return|intercepted|interception return|fumble return)\b/i.test(
    play.text,
  );
const offensive = (play: PlayType) =>
  !kickoff(play) &&
  !conversion(play) &&
  !administrative(play) &&
  !/^(FG|FGM|AFG|PUNT|_PuntReturn|BP|BFG|SF|SFOP)$/i.test(play.type) &&
  (/^(PASS|RUSH|REC|TD|PEN|F|_Sack|_PassIncomplete|_FumbleRecoeryOwn)$/i.test(
    play.type,
  ) ||
    /^[1-4](st|nd|rd|th)? & /.test(play.down ?? ""));
const touchdown = (drive: DriveType) =>
  /\b(Touchdown|TD)\b/i.test(drive.result);
const fieldGoal = (drive: DriveType) =>
  /^(Field Goal|FG|Made FG|Field Goal Good|FIELDGOAL Made field goal)$/i.test(
    drive.result,
  );
const scoreText = (game: GameType, scores: [number, number]) =>
  game.teams.map((team, i) => `${team.name} ${scores[i]}`).join(" / ");
const positionText = (distance: number) =>
  distance > 50
    ? `own ${100 - distance}`
    : distance === 50
      ? "midfield"
      : `opponent ${distance}`;

function conversionScoreError(
  drive: DriveType,
  before: [number, number],
  marker?: PlayType,
): string | null {
  if (touchdown(drive) && marker && conversion(marker)) {
    const scored = Math.max(
      ...drive.scores.map((score, team) => score - before[team]),
    );
    const failed =
      /no good|not good|failed|fails|unsuccessful/i.test(marker.text) ||
      /^(EPM|XPM|_BlockedPat)$/i.test(marker.type);
    const succeeded = /succeeds|successful|is good/i.test(marker.text);
    const twoPoint =
      /^(2PT|2PTC|2PC|PAT2|_?TwoPointPass|_?TwoPointRush)$/i.test(
        marker.type,
      ) || /two.point|2.point/i.test(marker.text);
    const conversionValue = failed
      ? 0
      : twoPoint && (succeeded || /^2PTC$/i.test(marker.type))
        ? 2
        : /^(XP|PAT)$/i.test(marker.type) || (!twoPoint && succeeded)
          ? 1
          : null;
    if (conversionValue !== null && scored !== 6 + conversionValue) {
      return "Drive score does not include the evidenced touchdown conversion; scoring sequence is ambiguous.";
    }
  }
  return null;
}

function leadingScoreMarkers(plays: PlayType[]): PlayType[] {
  const markers: PlayType[] = [];
  for (const play of plays) {
    if (!kickoff(play) && !conversion(play) && !administrative(play)) break;
    markers.push(play);
    if (kickoff(play)) break;
  }
  return markers;
}

/** Only the scoring segment and adjacent boundary are required for Comeback.
 * Earlier unrelated play-clock defects must not invalidate an evidenced score.
 */
function postScoreClock(
  game: GameType,
  driveIndex: number,
): { clock?: string; error?: string } {
  const drive = game.drives[driveIndex];
  const plays = drive.plays;
  let scoreIndex = -1;
  if (fieldGoal(drive)) scoreIndex = plays.map((p) => p.type).lastIndexOf("FG");
  else if (touchdown(drive) || /safety/i.test(drive.result)) {
    // Conversions/kickoffs may be attached to either possession. The final
    // live-ball play before them supplies the scoring-event boundary.
    for (let i = 0; i < plays.length; i++) {
      if (
        !administrative(plays[i]) &&
        !conversion(plays[i]) &&
        !kickoff(plays[i])
      )
        scoreIndex = i;
    }
  }
  if (scoreIndex < 0)
    return { error: "Cannot identify the scoring play for post-score timing." };
  const scorePlay = plays[scoreIndex];
  const scoreClock = parseClock(scorePlay.clock);
  if (!scoreClock)
    return {
      error: `Invalid scoring clock ${JSON.stringify(scorePlay.clock)}.`,
    };
  if (scoreClock.quarter > 4) return {}; // Regulation deficits only.
  const next = game.drives[driveIndex + 1]?.plays ?? [];
  const nextLeading = leadingScoreMarkers(next);
  const following = [...plays.slice(scoreIndex + 1), ...nextLeading];
  // A later-period kickoff is a restart, not the scoring event's clock.
  // Keep it in chronology checks, but prefer evidence from the scoring period.
  const marker = following.find(
    (p) =>
      (conversion(p) || kickoff(p)) &&
      parseClock(p.clock)?.quarter === scoreClock.quarter,
  );
  const conversionError = conversionScoreError(
    drive,
    game.drives[driveIndex - 1]?.scores ?? [0, 0],
    marker,
  );
  if (conversionError) return { error: conversionError };
  // Explicit endClock is an opt-in post-play field; never infer it from the
  // last live-ball play's clock. Same-clock end markers also provide evidence.
  const explicit = (drive as DriveType & { endClock?: string }).endClock;
  const endMarker = following.find(
    (p) => administrative(p) && p.clock === scorePlay.clock,
  );
  const clock = marker?.clock ?? explicit ?? endMarker?.clock;
  if (!clock)
    return {
      error:
        "Missing evidenced post-score clock (conversion, kickoff, or explicit end).",
    };
  const parsed = parseClock(clock);
  if (!parsed || parsed.quarter > 4)
    return {
      error: `Invalid regulation post-score clock ${JSON.stringify(clock)}.`,
    };
  if (parsed.quarter !== scoreClock.quarter)
    return {
      error:
        "Post-score marker crosses a period boundary; scoring time is ambiguous.",
    };
  // Validate the score's immediate predecessor and successor too. This catches
  // quarter typos without rejecting unrelated earlier possessions.
  const previousPlay =
    plays[scoreIndex - 1] ?? game.drives[driveIndex - 1]?.plays.slice(-1)[0];
  const segment = [
    ...(previousPlay ? [previousPlay] : []),
    scorePlay,
    ...(explicit && !marker ? [{ ...scorePlay, clock: explicit }] : []),
    ...following,
  ];
  const nextFirst = next.find((p) => !nextLeading.includes(p));
  if (nextFirst) segment.push(nextFirst);
  const error = timelineError(segment);
  if (error) return { error };
  return { clock };
}

function marchCandidate(
  game: GameType,
  driveIndex: number,
  winner: number,
): { candidate?: LateGameCandidate; error?: string } {
  const drive = game.drives[driveIndex];
  const before = game.drives[driveIndex - 1]?.scores ?? [0, 0];
  if (
    drive.team !== game.teams[winner].name ||
    (!touchdown(drive) && !fieldGoal(drive))
  )
    return {};
  const fgIndex = fieldGoal(drive)
    ? drive.plays.findIndex((p) => p.type === "FG")
    : -1;
  const possessionPlays =
    fieldGoal(drive) && fgIndex >= 0
      ? drive.plays.slice(0, fgIndex)
      : drive.plays;
  const live = possessionPlays.filter(offensive);
  const first = live[0];
  const last = live[live.length - 1];
  if (!first || !last)
    return { error: "Missing offensive plays for field position measurement." };
  if (
    nonOffensiveScore(last) ||
    /intercept|fumble return|punt|kickoff|blocked/i.test(drive.result)
  )
    return {}; // Return scores are not offensive marches.
  const storedClock = parseClock(first.clock);
  const snapTime = /^\((\d{0,2}):([0-5]\d)\)/.exec(first.text ?? "");
  // Modern play rows can store end-of-play clocks. An explicit play-by-play
  // snap time is stronger evidence for possession start than that field.
  const startClock =
    snapTime && storedClock
      ? `Q${storedClock.quarter} ${Number(snapTime[1])}:${snapTime[2]}`
      : first.clock;
  const clock = parseClock(startClock);
  if (!clock)
    return { error: `Invalid starting clock ${JSON.stringify(first.clock)}.` };
  if (clock.quarter > 4) return {};
  // Summary TD rows frequently carry the score's end time, not the snap time
  // (e.g. Miami's 2018 final lateral). Do not invent a zero-second start.
  if (first.type === "TD" && !/^\(\d{0,2}:\d{2}\)/.test(first.text))
    return {
      error:
        "Opening touchdown is a scoring summary; possession start clock is not evidenced.",
    };
  const opponent = 1 - winner;
  const gain = drive.scores[winner] - before[winner];
  if (
    drive.scores[opponent] !== before[opponent] ||
    (fieldGoal(drive) ? gain !== 3 : ![6, 7, 8].includes(gain))
  )
    return { error: "Ambiguous scoring sequence on winning possession." };
  const scoring = fieldGoal(drive)
    ? drive.plays.find((p) => p.type === "FG")
    : last;
  if (!scoring) return { error: "Missing successful field goal play." };
  const scoringClock = parseClock(scoring.clock);
  if (scoringClock && scoringClock.quarter > 4) return {};
  const startIndex = drive.plays.indexOf(first);
  const endIndex = drive.plays.indexOf(scoring);
  const conversionMarker = [
    ...drive.plays.slice(endIndex + 1),
    ...leadingScoreMarkers(game.drives[driveIndex + 1]?.plays ?? []),
  ].find(conversion);
  const conversionError = conversionScoreError(drive, before, conversionMarker);
  if (conversionError) return { error: conversionError };
  const prior = game.drives[driveIndex - 1]?.plays.slice(-1)[0];
  const segment = [
    ...(prior ? [prior] : []),
    ...drive.plays
      .slice(0, endIndex + 1)
      .map((p) => (p === first ? { ...p, clock: startClock } : p)),
  ];
  const timing = timelineError(segment);
  if (timing) return { error: timing };
  if (endIndex < startIndex)
    return { error: "Scoring play precedes offensive possession." };
  if (
    first.startYardsToEndzone === 0 ||
    live.some(
      (p) =>
        !Number.isFinite(p.startYardsToEndzone) ||
        p.startYardsToEndzone < 0 ||
        p.startYardsToEndzone > 100 ||
        !Number.isFinite(p.distance),
    )
  )
    return { error: "Invalid offensive field position or yardage." };
  const finish = touchdown(drive)
    ? 0
    : last.startYardsToEndzone - last.distance;
  if (finish < 0 || finish > 100)
    return { error: "Invalid finishing field position before field goal." };
  const value = first.startYardsToEndzone - finish;
  if (value < 0 || value > 100)
    return { error: "Net field position gain is outside 0–100 yards." };
  return {
    candidate: {
      value,
      remainingSeconds: clock.remaining,
      clock: startClock,
      startYardsToEndzone: first.startYardsToEndzone,
      description: `Time remaining at possession start: ${startClock}. Start: ${game.teams[winner].name} ${positionText(first.startYardsToEndzone)} (${first.startYardsToEndzone} yards to goal). Net gain: ${value} yards. ${scoreText(game, before)} → ${scoreText(game, drive.scores)}. Final: ${scoreText(game, game.scores)}.`,
    },
  };
}

export function analyzeLateGame(
  rawGame: GameType,
  teamIndex: number,
  mode: LateGameMode,
  year: number,
): LateGameAnalysis[] {
  const game = correctGameData(rawGame);
  const winner: number =
    game.scores[0] === game.scores[1]
      ? -1
      : game.scores[0] > game.scores[1]
        ? 0
        : 1;
  // Emit one analysis per loaded game, including exclusions and ties, so report
  // coverage does not depend on whether the game supplies a ranked candidate.
  if (teamIndex !== (winner < 0 ? 0 : winner)) return [];
  const analysis: LateGameAnalysis = {
    gameId: game.gameId,
    year,
    mode,
    candidates: [],
    exclusions: [],
  };
  const error = scoreError(game);
  if (error) {
    analysis.exclusions.push(error);
    return [analysis];
  }
  if (winner < 0) return [analysis];
  const opponent = 1 - winner;
  for (let i = 0; i < game.drives.length; i++) {
    const drive = game.drives[i];
    const before = game.drives[i - 1]?.scores ?? [0, 0];
    if (mode === "march") {
      if (
        before[winner] > before[opponent] ||
        drive.scores[winner] <= drive.scores[opponent] ||
        game.drives
          .slice(i + 1)
          .some((d) => d.scores[winner] <= d.scores[opponent])
      )
        continue;
      const result = marchCandidate(game, i, winner);
      if (result.candidate) analysis.candidates.push(result.candidate);
      if (result.error)
        analysis.exclusions.push(`Drive ${i + 1}: ${result.error}`);
    } else {
      if (
        drive.scores[opponent] <= before[opponent] ||
        drive.scores[winner] >= drive.scores[opponent]
      )
        continue;
      if (drive.scores[winner] !== before[winner]) {
        analysis.exclusions.push(
          `Drive ${i + 1}: Both teams' scores changed; scoring sequence is ambiguous.`,
        );
        continue;
      }
      const scored = drive.scores[opponent] - before[opponent];
      const validScore = fieldGoal(drive)
        ? scored === 3
        : touchdown(drive)
          ? [6, 7, 8].includes(scored)
          : /safety/i.test(drive.result)
            ? scored === 2
            : true;
      if (!validScore) {
        analysis.exclusions.push(
          `Drive ${i + 1}: Score change of ${scored} points disagrees with ${drive.result}.`,
        );
        continue;
      }
      const result = postScoreClock(game, i);
      if (result.error)
        analysis.exclusions.push(`Drive ${i + 1}: ${result.error}`);
      if (result.clock) {
        const value = drive.scores[opponent] - drive.scores[winner];
        analysis.candidates.push({
          value,
          clock: result.clock,
          remainingSeconds: parseClock(result.clock)!.remaining,
          description: `Time remaining after opponent scoring: ${result.clock}. Deficit: ${value} ${value === 1 ? "point" : "points"}. ${scoreText(game, drive.scores)}. Final: ${scoreText(game, game.scores)}.`,
        });
      }
    }
  }
  return [analysis];
}

type FrontierValue = { value: number; remainingSeconds: number };
export function dominates(a: FrontierValue, b: FrontierValue): boolean {
  return (
    a.value >= b.value &&
    a.remainingSeconds <= b.remainingSeconds &&
    (a.value > b.value || a.remainingSeconds < b.remainingSeconds)
  );
}
export function paretoFrontier<T extends FrontierValue>(candidates: T[]): T[] {
  return candidates.filter(
    (candidate) => !candidates.some((other) => dominates(other, candidate)),
  );
}

export function mapLateGamePoints(
  points: PointInType<LateGameAnalysis>[],
  mode: LateGameMode,
): (PointType & {
  lateGameReport?: LateGameReport;
  lateGameDetail?: string;
  lateGameMetric?: string;
})[] {
  const candidates = points.flatMap((point) =>
    point.extraction.candidates.map((candidate) => ({
      ...candidate,
      label: point.label,
    })),
  );
  const frontier = paretoFrontier(candidates);
  const selected = new Set(frontier);
  const sort = (
    a: (typeof candidates)[number],
    b: (typeof candidates)[number],
  ) =>
    b.value - a.value ||
    a.remainingSeconds - b.remainingSeconds ||
    a.label.localeCompare(b.label);
  const toPoint = (candidate: (typeof candidates)[number]) => ({
    x: candidate.clock,
    y: candidate.value,
    label: candidate.label,
    lateGameDetail: candidate.description,
    lateGameMetric: mode === "march" ? "Net yards" : "Deficit (points)",
  });
  const years = Array.from(new Set(points.map((p) => p.extraction.year))).sort(
    (a, b) => a - b,
  );
  const exclusions = points
    .filter((p) => p.extraction.exclusions.length)
    .map((p) => ({ label: p.label, reasons: p.extraction.exclusions }));
  const report: LateGameReport = {
    title:
      mode === "march"
        ? "Winning-possession net yards"
        : "Opponent-established comeback deficits",
    definition:
      mode === "march"
        ? "Net field position gained on the offensive possession that takes the eventual winner from tied or behind to a lead never relinquished. Clock is regulation time remaining at possession start; kick and return yards are excluded."
        : "Deficits established by opponent scoring, including conversions, followed by an eventual win. Clock is regulation time remaining after that scoring sequence; wins in overtime are eligible.",
    scope: `Loaded seasons: ${years.length ? years.join(", ") : "none"}. Available trustworthy records only; this is not an all-history leaderboard. Listed records favor more ${mode === "march" ? "net yards" : "points"} with less time remaining and preserve exact ties.`,
    gamesAnalyzed: points.length,
    excludedGames: exclusions.length,
    exclusions,
    dominated: candidates
      .filter((c) => !selected.has(c))
      .sort(sort)
      .map((c) => ({ x: c.description, y: c.value, label: c.label })),
  };
  return [
    { x: "", y: Number.MAX_VALUE, label: "", lateGameReport: report },
    ...frontier.sort(sort).map(toPoint),
  ];
}
