import { DataType } from "../Data";
import { GraphType, groupByF } from "../Query";

export default function Penalty(datas: DataType[]): GraphType {
  return Object.entries(
    groupByF(
      datas.flatMap((d) =>
        d.games.flatMap((g) =>
          g.playByPlay.flatMap((pbp) =>
            pbp.plays
              .map((p) => ({ p, m: p.text?.match(/penalty on ([A-Z]+)/i) }))
              .filter(({ m }) => m)
              .map(({ p, m }) => ({ p, against: m![1] }))
              .map(({ p, against }) => ({
                p,
                against: { HST: "HOU", BLT: "BAL" }[against] || against,
              }))
              .flatMap(({ p, against }) => [
                { d, g, pbp, p, group: `against ${against}` },
                {
                  d,
                  g,
                  pbp,
                  p,
                  group: `for ${g.teams.find((t) => t.name !== against)!.name}`,
                },
              ])
          )
        )
      ),
      (t) => t.group
    )
  )
    .map(([group, objs]) => ({ group, objs }))
    .map((o) => ({
      x: o.objs.length,
      y: o.objs.map((oo) => Math.abs(oo.p.distance)).reduce((a, b) => a + b, 0),
      label: o.group,
    }))
    .sort((a, b) => b.y - a.y);
}
