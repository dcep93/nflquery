import { DataType, GameType } from "../Data";
import { PointType } from "../Query";

export type QueryFunctions<T, U> = {
  extract: (o: { d: DataType; g: GameType; tI: number }) => T[];
  mapToPoint: (o: {
    timestamp: number;
    extraction: T;
    label: string;
  }) => U | null;
  transform: (points: U[]) => PointType[];
};

export default function getPoints<T, U>(
  customFunctions: QueryFunctions<T, U>,
  datas: DataType[]
): PointType[] {
  return customFunctions
    .transform(
      datas
        .flatMap((d) =>
          d.games.flatMap((g) => g.teams.map((_, tI) => ({ d, g, tI })))
        )
        .flatMap((o) =>
          customFunctions.extract(o).map((extraction) => ({
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
        .map(customFunctions.mapToPoint)
        .filter((o) => o)
        .map((o) => o!)
    )
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}
