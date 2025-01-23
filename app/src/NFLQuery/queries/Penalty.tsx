import { DataType } from "../Data";
import { groupByF, PointType } from "../Query";

export default function Penalty(datas: DataType[]): PointType[] {
  return Object.entries(
    groupByF(
      datas
        .flatMap((d) =>
          d.games.flatMap((g) =>
            g.drives.flatMap((dr) =>
              dr.plays
                .map((p) => ({
                  p,
                  m: p.text?.match(/penalty on ([A-Z]+)/i),
                  safetyM: p.text?.match(
                    /[(for a safety)|(enforced in end zone)]/i
                  ),
                }))
                .filter(({ m }) => m)
                .map(({ p, m, safetyM }) => ({
                  p,
                  against: safetyM ? dr.team : m![1],
                }))
                .map(({ p, against }) => ({
                  p,
                  against:
                    {
                      HST: "HOU",
                      BLT: "BAL",
                    }[against] || against,
                }))
                .flatMap(({ p, against }) => [
                  { d, g, dr, p, type: "against", teamName: against },
                  {
                    d,
                    g,
                    dr,
                    p,
                    type: "for",
                    teamName: g.teams.find((t) => t.name !== against)!.name,
                  },
                ])
            )
          )
        )
        .map((o) => ({
          ...o,
          group: `${o.type} ${
            { STL: "LAR", SD: "LAC", OAK: "LV" }[o.teamName] || o.teamName
          }`,
        })),
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
