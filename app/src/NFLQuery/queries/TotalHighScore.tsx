import { DataType } from "../Data";

export default function TotalHighScore(datas: DataType[]) {
  // return MaxBuilder({
  //   transform: (o) => o,
  //   filter: ({ dri, pi }) => dri === 0 && pi === 0,
  //   map: ({ d, g }) => ({
  //     x: g.scores.reduce((a, b) => a + b, 0),
  //     y: g.scores.reduce((a, b) => a + b, 0),
  //     label: `total:${g.teams.map((t) => t.name).join(" @ ")} ${d.year}w${
  //       g.week
  //     }:${g.gameId}`,
  //   }),
  //   datas,
  // });
}
