import { DataType } from "../Data";
import { GraphType } from "../Query";

export default function TeamHighScore(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.scores.map((s, i) => ({
          x: g.scores[1 - i],
          y: s,
          label: `team:${g.teams.map((t) => t.name).join(" @ ")} ${d.year}w${
            g.week
          }:${g.gameId}`,
        }))
      )
    )
    .sort((a, b) => b.y - a.y)
    .slice(0, 10);
}
