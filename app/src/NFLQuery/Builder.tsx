import { CustomType } from "./custom_queries";
import { DataType, GameType } from "./Data";
import { PointType } from "./Query";

export type QueryType = {
  custom: CustomType;
  getPoints: (datas: DataType[]) => PointType[];
};

export function BestTeamGameQuery<T>(functions: {
  extract: (o: { d: DataType; g: GameType; tI: number }) => T;
  mapToPoint: (o: {
    timestamp: number;
    extraction: T;
    label: string;
  }) => PointType | null;
}): QueryType {
  return {
    custom: { name: BestTeamGameQuery.name, functions },
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
