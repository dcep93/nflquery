import { DataType } from "../Data";
import { GraphType, groupByF, isPlay } from "../Query";

export default function Year4thDown(datas: DataType[]): GraphType {
  return datas
    .map((d) => ({
      d,
      downs: d.games.flatMap((g) =>
        g.drives.flatMap((dr) =>
          dr.plays
            .map((p, pi) => ({
              d,
              g,
              dr,
              p,
              pi,
            }))
            .filter(({ p }) => p.down?.startsWith("4th"))
            .filter(({ p }) => isPlay(p))
            .map((o) => ({
              ...o,
              outcome:
                dr.plays.slice(o.pi + 1).find((pp) => isPlay(pp)) !==
                  undefined || dr.result.toLowerCase().endsWith("td")
                  ? "success"
                  : [
                      "safety",
                      "sack",
                      "fumble",
                      "interception",
                      "poss. on downs",
                    ].includes(dr.result.toLowerCase())
                  ? "failure"
                  : "kick",
            }))
        )
      ),
    }))
    .map((o) => ({ ...o, grouped: groupByF(o.downs, (oo) => oo.outcome) }))
    .map((o) => ({
      x: o.d.year,
      y: o.grouped.success?.length || 0,
      label: `${o.d.year}/${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .join(",")}/${o.downs.length}`,
    }));
}
