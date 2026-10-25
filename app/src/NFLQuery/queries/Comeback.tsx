import { PointType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "biggest point deficit overcome in smallest time",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .map((dr, drI) => ({ dr, drI }))
        // Start when this score was established, not after the next possession.
        .filter(({ dr, drI }) => {
          const previousScores = o.g.drives[drI - 1]?.scores ?? [0, 0];
          return (
            dr.plays.length > 0 &&
            dr.scores.some((score, i) => score !== previousScores[i])
          );
        })
        .map(({ dr }) =>
          (({ driveScores }) => ({
            o,
            clock: dr.plays[dr.plays.length - 1].clock,
            driveScores,
            pointsDeficit: (!driveScores
              ? null
              : window.QueryHelpers.getHomeAdvantage(driveScores) *
                (o.teamIndex === 0 ? 1 : -1))!,
          }))({
            driveScores: dr.scores,
          })
        )
        .filter(
          (o) =>
            o.driveScores &&
            window.QueryHelpers.getHomeAdvantage(o.driveScores) *
              window.QueryHelpers.getHomeAdvantage(o.o.g.scores) <
              0
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
