import { QueryFunctions } from ".";
import { DataType } from "../Data";
import { PointType } from "../Query";

export default function getPoints<T, U>(
  customFunctions: QueryFunctions<T, U>,
  datas: DataType[]
): PointType[] {
  return customFunctions
    .transform(
      datas
        .flatMap((d) =>
          d.games.flatMap((g) =>
            g.teams.map((_, teamIndex) => ({ d, g, teamIndex }))
          )
        )
        .flatMap((o) =>
          customFunctions.extract(o).map((extraction) => ({
            extraction,
            timestamp: o.g.timestamp,
            label: ((matchup) =>
              `${matchup} ${o.d.year}w${o.g.week}:${o.g.gameId}`)(
              ((teams) =>
                o.teamIndex === 0
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
    .sort((a, b) => b.y - a.y);
}
