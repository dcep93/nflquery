import { DataType } from "../Data";

export default function MinPossessionTime(datas: DataType[]) {
  // return MaxBuilder({
  //   transform: (o) => o,
  //   filter: ({ dri, pi }) => dri <= 1 && pi === 0,
  //   map: ({ d, g, dri }) =>
  //     ((o) =>
  //       o.rawPossessionTime === undefined
  //         ? null
  //         : {
  //             x: g.scores.join(" "),
  //             y: clockToSeconds(o.rawPossessionTime),
  //             label: `${o.rawPossessionTime} ${o.matchup} ${d.year}w${g.week}:${g.gameId}`,
  //           })({
  //       rawPossessionTime: g.teams[dri].statistics.possessionTime,
  //       matchup:
  //         dri === 0
  //           ? g.teams.map((t) => t.name).join(" @ ")
  //           : g.teams
  //               .slice()
  //               .reverse()
  //               .map((t) => t.name)
  //               .join(" vs "),
  //     }),
  //   datas,
  // });
}
