import { DataType } from "../Data";
import { GraphType } from "../Query";

export default function TotalHighScore(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games.map((g) => ({
        x: Math.abs(g.scores[0] - g.scores[1]),
        y: g.scores.reduce((a, b) => a + b, 0),
        label: `total:${g.teams.map((t) => t.name).join(" @ ")} ${d.year}w${
          g.week
        }:${g.gameId}`,
      }))
    )
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}
