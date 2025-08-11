import { clockToSeconds, getHomeAdvantage, PointType } from "../Query";
import BuildBestTeamGameQuery from "./custom/BuildBestTeamGameQuery";

export default function Comeback() {
  return {
    tooltip: "biggest point deficit overcome in smallest time",
    query: BuildBestTeamGameQuery({
      extract: (o) =>
        o.g.drives
          .map((dr, drI) => ({ dr, drI }))
          .filter(({ dr }) => dr.team === o.g.teams[o.tI].name)
          .map(({ dr, drI }) =>
            (({ driveScores }) => ({
              o,
              clock: dr.plays[dr.plays.length - 1].clock,
              driveScores,
              pointsDeficit: (!driveScores
                ? null
                : getHomeAdvantage(driveScores) * (o.tI === 0 ? 1 : -1))!,
            }))({
              driveScores: o.g.drives[drI - 1]?.scores,
            })
          )
          .filter(
            (o) =>
              o.driveScores &&
              getHomeAdvantage(o.driveScores) * getHomeAdvantage(o.o.g.scores) <
                0
          ),
      mapToPoint: (o) => ({
        x: `${o.extraction.clock} (${o.extraction.driveScores}) -> (${o.extraction.o.g.scores})`,
        y: o.extraction.pointsDeficit,
        label: o.label,
        elapsedSeconds: clockToSeconds(o.extraction.clock),
      }),
      transform: (points) =>
        points
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
  };
}
