import { DataType } from "../Data";
import { GraphType } from "../Query";

export default function MinPossessionTime(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.teams
          .map((t, i) => ({
            rawPossessionTime: t.statistics.possessionTime!,
            lastDrive: g.playByPlay[g.playByPlay.length - 1],
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
            x: `${o.lastDrive.homeScore - o.lastDrive.homeAdvantage} ${
              o.lastDrive.homeScore
            }`,
            y: o.rawPossessionTime
              .split(":")
              .map((p, i) => (i === 0 ? 60 : 1) * parseInt(p))
              .reduce((a, b) => a + b, 0),
            label: `${o.rawPossessionTime} ${o.matchup} ${d.year}w${g.week}:${g.gameId}`,
          }))
      )
    )
    .sort((a, b) => a.y - b.y)
    .slice(0, 10);
}
