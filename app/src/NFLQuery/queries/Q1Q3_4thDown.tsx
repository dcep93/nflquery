import { PointType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "biggest point deficit overcome in smallest time",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .map((dr, drI) => ({ dr, drI }))
        .filter(({ dr }) => dr.team === o.g.teams[o.teamIndex].name)
        .map(({ dr, drI }) =>
          (({ driveScores }) => ({
            o,
            clock: dr.plays[dr.plays.length - 1].clock,
            driveScores,
            pointsDeficit: (!driveScores
              ? null
              : window.QueryHelpers.getHomeAdvantage(driveScores) *
                (o.teamIndex === 0 ? 1 : -1))!,
          }))({
            driveScores: o.g.drives[drI - 1]?.scores,
          })
        )
        .filter(
          (o) =>
            o.driveScores &&
            window.QueryHelpers.getHomeAdvantage(o.driveScores) *
              window.QueryHelpers.getHomeAdvantage(o.o.g.scores) <
              0
        ),
    mapToPoint: (o) => ({
      x: `${o.extraction.clock} (${o.extraction.driveScores}) -> (${o.extraction.o.g.scores})`,
      y: o.extraction.pointsDeficit,
      label: o.label,
      elapsedSeconds: window.QueryHelpers.clockToSeconds(o.extraction.clock),
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
});

// export default function Q1Q3_4thDown(datas: DataType[]) {
//   // return YearBuilder({
//   //   transform: (o) => o,
//   //   filter: ({ dr, p }) =>
//   //     ["Q1", "Q3"].includes(dr.plays?.[0].clock.split(" ")[0]) &&
//   //     isPlay(p) &&
//   //     p.down?.startsWith("4th"),
//   //   classify: ({ p }) =>
//   //     [
//   //       "_MuffedPuntRecoveryOpp",
//   //       "PUNT",
//   //       "AFG",
//   //       "BFG",
//   //       "FG",
//   //       "FGM",
//   //       "PUNT",
//   //       "_PuntReturn",
//   //       "BP",
//   //     ].includes(p.type)
//   //       ? "kick"
//   //       : p.type === "TD" ||
//   //         p.startYardsToEndzone === p.distance ||
//   //         p.distance >= parseInt(p.down.split(" ").reverse()[0])
//   //       ? "success"
//   //       : "failure",
//   //   quantify: ({ grouped, filtered }) =>
//   //     (grouped.kick || []).length / filtered.length,
//   //   datas,
//   // });
// }
