import { DataType } from "../Data";
import { clockToSeconds, getHomeAdvantage, PointType } from "../Query";

export default function Comeback(datas: DataType[]): PointType[] {
  return datas
    .flatMap((d) =>
      d.games
        .map((g) => ({ g, endHomeAdvantage: getHomeAdvantage(g.scores) }))
        .flatMap(({ g, endHomeAdvantage }) =>
          g.drives.map((dr, i) => ({
            d,
            g,
            dr,
            endHomeAdvantage,
            x: dr.plays[dr.plays.length - 1].clock,
            y: (i === 0
              ? null
              : endHomeAdvantage === 0
              ? null
              : getHomeAdvantage(g.drives[i - 1].scores) *
                (endHomeAdvantage > 0 ? -1 : 1))!,
          }))
        )
    )
    .filter((o) => o.y > 0)
    .map((o) => ({
      ...o,
      elapsedSeconds: clockToSeconds(o.dr.plays[o.dr.plays.length - 1].clock),
    }))
    .sort((a, b) =>
      a.elapsedSeconds === b.elapsedSeconds
        ? b.y - a.y
        : a.elapsedSeconds - b.elapsedSeconds
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
        rval: [] as PointType[],
      }
    )
    .rval.sort((a, b) => b.y - a.y);
}
