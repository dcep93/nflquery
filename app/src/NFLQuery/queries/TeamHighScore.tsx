import { DataType } from "../Data";

export default function TeamHighScore(datas: DataType[]) {
  // return MaxBuilder({
  //   transform: (o) => o,
  //   filter: ({ dri, pi }) => dri <= 1 && pi === 0,
  //   map: ({ d, g, dri }) => ({
  //     x: g.scores[1 - dri],
  //     y: g.scores[dri],
  //     label: `team:${g.teams.map((t) => t.name).join(" @ ")} ${d.year}w${
  //       g.week
  //     }:${g.gameId}`,
  //   }),
  //   datas,
  // });
}
