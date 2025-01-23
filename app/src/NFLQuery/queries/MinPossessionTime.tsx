import { DataType } from "../Data";
import { clockToSeconds, PointType } from "../Query";

export default function MinPossessionTime(datas: DataType[]): PointType[] {
  return datas
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.teams
          .map((t, i) => ({
            g,
            rawPossessionTime: t.statistics.possessionTime!,
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
            x: o.g.scores.join(" "),
            y: clockToSeconds(o.rawPossessionTime),
            label: `${o.rawPossessionTime} ${o.matchup} ${d.year}w${g.week}:${g.gameId}`,
          }))
      )
    )
    .sort((a, b) => a.y - b.y)
    .slice(0, 10);
}
