import { DataType } from "../Data";
import { clog } from "../Fetch";
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
              next: dr.plays
                .slice(o.pi + 1)
                .filter((pp) => isPlay(pp))
                .filter(
                  (pp) =>
                    ![
                      "K",
                      "XP",
                      "EP",
                      "EG",
                      "ER",
                      "SF",
                      "_TwoPointPass",
                      "_TwoPointRush",
                    ].includes(pp.type)
                )
                .filter((pp) => !pp.type.startsWith("2004."))
                .filter((pp) => !pp.down)
                .map(clog)
                .find((pp) => pp.down.startsWith("1st")),
            }))
            .map((o) => ({
              ...o,
              outcome:
                o.next !== undefined || dr.result.toLowerCase().endsWith("td")
                  ? "success"
                  : ["REC"].includes(o.p.type)
                  ? "failure"
                  : "kick",
            }))
        )
      ),
    }))
    .map((o) => ({
      ...o,
      year: o.d.year,
      grouped: groupByF(o.downs, (oo) => oo.outcome),
    }))
    .map(clog)
    .map((o) => ({
      x: o.d.year,
      y: parseFloat(
        ((o.grouped.success?.length || 0) / o.downs.length).toFixed(2)
      ),
      label: `${o.d.year}/${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.downs.length}`,
    }))
    .sort((a, b) => a.y - b.y);
}
