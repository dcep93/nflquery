import { DataType } from "../Data";
import { GraphType } from "../Query";

export default function MinPossessionTime(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.teams
          .map((t, i) => ({
            d,
            g,
            rawPossessionTime: t.statistics.possessionTime!,
            x: 0,
            matchup:
              i === 0
                ? g.teams.map((t) => t.name).join(" @ ")
                : g.teams
                    .slice()
                    .reverse()
                    .map((t) => t.name)
                    .join(" vs "),
          }))
          .filter(({ rawPossessionTime }) => rawPossessionTime)
          .map((o) => ({
            x: o.x,
            y: o.rawPossessionTime
              .split(":")
              .map((p, i) => (i === 0 ? 60 : 1) * parseInt(p))
              .reduce((a, b) => a + b, 0),
            label: `${o.rawPossessionTime} ${o.matchup} ${o.d.year}w${o.g.week}:${o.g.gameId}`,
          }))
      )
    )
    .sort((a, b) => a.y - b.y)
    .slice(0, 10);
}
