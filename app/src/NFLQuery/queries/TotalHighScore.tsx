import { MaxBuilder } from "../Builder";
import { DataType } from "../Data";
import { PointType } from "../Query";

export default function TotalHighScore(datas: DataType[]): PointType[] {
  return MaxBuilder({
    filter: ({ dri, pi }) => dri === 0 && pi === 0,
    map: ({ d, g }) => ({
      x: g.scores.reduce((a, b) => a + b, 0),
      y: g.scores.reduce((a, b) => a + b, 0),
      label: `total:${g.teams.map((t) => t.name).join(" @ ")} ${d.year}w${
        g.week
      }:${g.gameId}`,
    }),
    datas,
  });
}
