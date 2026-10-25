import { PointType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "biggest deficit overcome from the opponent's last possession at that score",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .map((dr, drI) => ({ dr, drI }))
        // Each opponent possession is a candidate; mapPoints keeps the latest.
        .filter(
          ({ dr }) =>
            dr.team === o.g.teams[1 - o.teamIndex].name && dr.plays.length > 0
        )
        .map(({ dr, drI }) => {
          const previousScores = o.g.drives[drI - 1]?.scores ?? [0, 0];
          // On a defensive/return score, use the score before possession changed.
          const driveScores = dr.scores[o.teamIndex] > previousScores[o.teamIndex]
            ? previousScores
            : dr.scores;
          return {
            o,
            clock: dr.plays[dr.plays.length - 1].clock,
            driveScores,
            pointsDeficit: driveScores[1 - o.teamIndex] - driveScores[o.teamIndex],
          };
        })
        .filter(
          (o) =>
            o.pointsDeficit > 0 &&
            o.o.g.scores[o.o.teamIndex] > o.o.g.scores[1 - o.o.teamIndex]
        ),
    mapPoints: (points) => {
      const candidates = points
        .map((o) => ({
          x: `${o.extraction.clock} (${o.extraction.driveScores}) -> (${o.extraction.o.g.scores})`,
          y: o.extraction.pointsDeficit,
          label: o.label,
          gameId: o.extraction.o.g.gameId,
          elapsedSeconds: window.QueryHelpers.clockToSeconds(
            o.extraction.clock
          ),
        }))
        .sort((a, b) =>
          a.elapsedSeconds - b.elapsedSeconds || b.y - a.y || a.gameId - b.gameId
        );
      let recordDeficit = 0;
      return candidates
        .filter((point) => {
          if (point.y <= recordDeficit) return false;
          recordDeficit = point.y;
          return true;
        })
        .sort((a, b) => b.y - a.y)
        .map((record) => {
          // Candidates are fastest first. Keep each game's latest qualifying
          // possession, and never count another possession from the record game.
          const games = new Set<number>();
          const slowerComebacks: PointType[] = [];
          for (const candidate of candidates) {
            if (candidate.gameId === record.gameId || candidate.y < record.y) continue;
            if (games.has(candidate.gameId)) continue;
            games.add(candidate.gameId);
            // Equal clocks are ties, not slower comebacks.
            if (candidate.elapsedSeconds <= record.elapsedSeconds) continue;
            slowerComebacks.push({ x: candidate.x, y: candidate.y, label: candidate.label });
          }
          const point: PointType = { x: record.x, y: record.y, label: record.label };
          return slowerComebacks.length
            ? {
                ...point,
                x: `${point.x} (${slowerComebacks.length} more but slower)`,
                slowerComebacks,
              }
            : point;
        });
    },
  }),
});
