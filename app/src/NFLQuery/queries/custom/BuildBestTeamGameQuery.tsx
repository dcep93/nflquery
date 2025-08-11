import { DataType, GameType } from "../../Data";
import { PointType, QueryType } from "../../Query";
import { getCustomFunctions } from "./CustomQuery";

export const BestTeamGameQuery = () => {
  const evaledFunctions = getCustomFunctions({
    extract: (o: any) => [Object.keys(o)],
    mapToPoint: (o: any) => o,
  });
  // @ts-ignore
  return {
    tooltip: "iterate over each game for each team",
    query: BuildBestTeamGameQuery(evaledFunctions),
  };
};

export default function BuildBestTeamGameQuery<T, U>(functions: {
  extract: (o: { d: DataType; g: GameType; tI: number }) => T[];
  mapToPoint: (o: {
    timestamp: number;
    extraction: T;
    label: string;
  }) => U | null;
  transform: (points: U[]) => PointType[];
}): QueryType {
  return {
    custom: { name: "BestTeamGameQuery", functions },
    getPoints: (datas) =>
      functions
        .transform(
          datas
            .flatMap((d) =>
              d.games.flatMap((g) => g.teams.map((_, tI) => ({ d, g, tI })))
            )
            .flatMap((o) =>
              functions.extract(o).map((extraction) => ({
                extraction,
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
            )
            .map(functions.mapToPoint)
            .filter((o) => o)
            .map((o) => o!)
        )
        .sort((a, b) => b.y - a.y)
        .slice(0, 50),
  };
}
