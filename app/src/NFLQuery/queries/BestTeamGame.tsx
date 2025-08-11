import { QueryType } from "../Builder";
import { DataType, GameType } from "../Data";
import { PointType } from "../Query";

export default BuildBestTeamGameQuery({
  extract: (o) =>
    o.g.drives
      .filter((d) => d.team === o.g.teams[o.tI].name)
      .flatMap((d) => d.plays)
      .map((p) => p.text.match(/punts (\d+) yard/))
      .filter((match) => match)
      .map((match) => parseInt(match![1])),
  mapToPoint: (o) => ({
    x: o.timestamp,
    y:
      o.extraction.length === 0
        ? 0
        : o.extraction.reduce((a, b) => a + b, 0) / o.extraction.length,
    label: `${o.extraction.join(",")} ${o.label}`,
  }),
});

export function BuildBestTeamGameQuery<T>(functions: {
  extract: (o: { d: DataType; g: GameType; tI: number }) => T;
  mapToPoint: (o: {
    timestamp: number;
    extraction: T;
    label: string;
  }) => PointType | null;
}): QueryType {
  return {
    custom: { name: "BestTeamGame", functions },
    getPoints: (datas) =>
      datas
        .flatMap((d) =>
          d.games.flatMap((g) => g.teams.map((_, tI) => ({ d, g, tI })))
        )
        .map((o) => ({
          extraction: functions.extract(o),
          timestamp: o.g.timestamp,
          label: ((matchup) =>
            `${matchup} ${o.d.year}w${o.g.week}:${o.g.gameId}`)(
            ((teams) =>
              o.tI === 0
                ? teams.map((t) => t.name).join(" @ ")
                : teams
                    .slice()
                    .reverse()
                    .map((t) => t.name)
                    .join(" vs "))(o.g.teams)
          ),
        }))
        .map(functions.mapToPoint)
        .filter((o) => o)
        .map((o) => o!)
        .sort((a, b) => b.y - a.y)
        .slice(0, 50),
  };
}
