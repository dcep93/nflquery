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
    mapPoints: (points) =>
      points
        .map((o) => ({
          x: `${o.extraction.clock} (${o.extraction.driveScores}) -> (${o.extraction.o.g.scores})`,
          y: o.extraction.pointsDeficit,
          label: o.label,
          elapsedSeconds: window.QueryHelpers.clockToSeconds(
            o.extraction.clock
          ),
        }))
        .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)
        .map(({ elapsedSeconds, ...point }) => point)
        .reduce(
          (prev, curr) =>
            prev.record >= curr.y
              ? prev
              : {
                  record: curr.y,
                  rval: prev.rval.concat(curr),
                },
          {
            record: 0,
            rval: [] as PointType[],
          }
        )
        .rval.map((point) => point)
        .sort((a, b) => b.y - a.y),
  }),
});
