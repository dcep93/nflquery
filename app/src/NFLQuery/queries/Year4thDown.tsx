import { DataType } from "../Data";
import { clog } from "../Fetch";
import { GraphType, groupByF, isPlay } from "../Query";

export default function Year4thDown(datas: DataType[]): GraphType {
  clog(
    Object.entries(
      groupByF(
        datas
          .flatMap((d) =>
            d.games.flatMap((g) =>
              g.drives.flatMap((dr) => dr.plays.map((p) => ({ p, dr, g, d })))
            )
          )
          .filter((o) => o.p.type === ""),
        (o) => `${o.p.type}:${o.d.year}`
      )
    )
      .map(([k, v]) => ({ k, x: v.length, v }))
      .sort((a, b) => b.x - a.x)
  );
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
    .map((o) => ({
      x: o.d.year,
      y: o.grouped.success?.length || 0,
      label: `${o.d.year}/${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.downs.length}`,
    }));
}
