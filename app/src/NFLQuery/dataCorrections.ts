import type { DataType, GameType } from "./types";

/** Narrow, immutable repairs also applied to existing browser caches and custom data.
 * Source: official scoring summary and Q2/Q3 play-by-play:
 * https://static.www.nfl.com/image/upload/v1677631535/gamecenter/10012007-1202-095d-863f-eb38460fa7a3.pdf
 */
export function correctGameData(game: GameType): GameType {
  if (
    game.gameId !== 271202028 ||
    game.teams[0]?.name !== "BUF" ||
    game.teams[1]?.name !== "WSH"
  )
    return game;
  let changed = false;
  const drives = game.drives.map((drive, index) => {
    if (index !== 6 && index !== 13) return drive;
    let scores = drive.scores;
    if (
      index === 6 &&
      drive.team === "WSH" &&
      scores[0] === 14 &&
      scores[1] === 16
    ) {
      scores = [2, 9];
    }
    const plays = drive.plays.map((play, playIndex) => {
      if (playIndex !== drive.plays.length - 1 || drive.team !== "WSH")
        return play;
      if (index === 6 && play.type === "K" && play.clock === "Q4 0:25")
        return { ...play, clock: "Q2 0:25" };
      if (index === 13 && play.type === "INT" && play.clock === "Q4 0:26")
        return { ...play, clock: "Q3 0:26" };
      return play;
    });
    if (
      scores === drive.scores &&
      plays.every((play, i) => play === drive.plays[i])
    )
      return drive;
    changed = true;
    return { ...drive, scores, plays };
  });
  return changed ? { ...game, drives } : game;
}

export function correctSeasonData(data: DataType): DataType {
  const games = data.games.map(correctGameData);
  return games.every((game, i) => game === data.games[i])
    ? data
    : { ...data, games };
}
