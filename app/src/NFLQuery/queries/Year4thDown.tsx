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
            .filter(({ p }) => isPlay(p))
            .filter(({ p }) => p.down?.startsWith("4th"))
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
                .filter((pp) => pp.down)
                .find((pp) => pp.down.startsWith("1st")),
            }))
            .map((o) => ({
              ...o,
              outcome: [
                "_MuffedPuntRecoveryOpp",
                "PUNT",
                "AFG",
                "BFG",
                "FG",
                "FGM",
                "PUNT",
                "_PuntReturn",
                "BP",
              ].includes(o.p.type)
                ? "kick"
                : o.next !== undefined || o.p.type === "TD"
                ? "success"
                : "failure",
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
      y: o.grouped.kick.length / o.downs.length,
      label: `${o.d.year}/${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.downs.length}`,
    }));
}
