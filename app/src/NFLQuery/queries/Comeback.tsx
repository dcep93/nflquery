import { DataType, GameType } from "../Data";
import { GraphType } from "../Query";

export default function Comeback(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games
        .map((g) => ({
          g,
          homeAdvantage: g.playByPlay[g.playByPlay.length - 1].homeAdvantage,
        }))
        .flatMap(({ g, homeAdvantage }) =>
          g.playByPlay.map((pbp) => ({
            pbp,
            d,
            g,
            rMinutes: 0, // todo
            comeback: (homeAdvantage === 0
              ? null
              : pbp.homeAdvantage * (homeAdvantage > 0 ? 1 : -1))!,
          }))
        )
    )
    .filter((o) => o.comeback > 0)
    .sort((a, b) => b.comeback - a.comeback)
    .reduce(
      (prev, curr) =>
        prev.record > curr.comeback
          ? prev
          : { record: curr.comeback, rval: prev.rval.concat(curr) },
      {
        record: -1,
        rval: [] as {
          comeback: number;
          rMinutes: number;
          d: DataType;
          g: GameType;
        }[],
      }
    )
    .rval.map((o) => ({
      x: o.comeback,
      y: o.rMinutes,
      label: `${o.g.teams.map((t) => t.name).join(" @ ")} ${o.d.year}w${
        o.g.week
      }`,
    }))
    .sort((a, b) => b.y - a.y);
}
