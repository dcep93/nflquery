import { DataType } from "../Data";
import { GraphType } from "../Query";

export default function Comeback(datas: DataType[]): GraphType {
  return datas
    .flatMap((d) =>
      d.games
        .map((g) => ({
          g,
          endHomeAdvantage: g.playByPlay[g.playByPlay.length - 1].homeAdvantage,
        }))
        .flatMap(({ g, endHomeAdvantage }) =>
          g.playByPlay.map((pbp, i) => ({
            d,
            g,
            pbp,
            endHomeAdvantage,
            x: pbp.plays[pbp.plays.length - 1].clock,
            y: (i === 0
              ? null
              : endHomeAdvantage === 0
              ? null
              : g.playByPlay[i - 1].homeAdvantage *
                (endHomeAdvantage > 0 ? -1 : 1))!,
          }))
        )
    )
    .filter((o) => o.y > 0)
    .map((o) => ({
      ...o,
      match:
        o.pbp.plays[o.pbp.plays.length - 1].clock.match(/Q(\d) (\d+):(\d+)/)!,
    }))
    .map((o) => ({
      ...o,
      rMinutes:
        15 * (4 - parseInt(o.match[1])) +
        parseInt(o.match[2]) +
        parseInt(o.match[3]) / 60,
    }))
    .sort((a, b) =>
      a.rMinutes === b.rMinutes ? b.y - a.y : a.rMinutes - b.rMinutes
    )
    .reduce(
      (prev, curr) =>
        prev.record >= curr.y
          ? prev
          : {
              record: curr.y,
              rval: prev.rval.concat({
                x: curr.x,
                y: curr.y,
                label: `${
                  curr.endHomeAdvantage > 0
                    ? curr.g.teams
                        .slice()
                        .reverse()
                        .map((t) => t.name)
                        .join(" vs ")
                    : curr.g.teams.map((t) => t.name).join(" @ ")
                } ${curr.d.year}w${curr.g.week}:${curr.g.gameId}`,
              }),
            },
      {
        record: -1,
        rval: [] as GraphType,
      }
    )
    .rval.sort((a, b) => b.y - a.y);
}
