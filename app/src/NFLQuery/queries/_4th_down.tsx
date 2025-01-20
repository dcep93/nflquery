import { DataType } from "../Data";
import { GraphType, groupByF } from "../Query";

export default function _4th_down(datas: DataType[]): GraphType {
  return Object.entries(
    groupByF(
      datas.flatMap((d) =>
        d.games.flatMap((g) =>
          g.drives.flatMap((dr) =>
            dr.plays
              .filter((p) => p.down?.startsWith("4th"))
              .filter(
                (p) => !p.text?.toLowerCase().includes("two-minute warning")
              )
              .filter((p) => !p.text?.toLowerCase().includes("timeout"))
              .filter((p) => !p.text?.toLowerCase().includes("penalty"))
              .map((p) => ({ d, g, dr, p }))
          )
        )
      ),
      (t) => t.dr.team
    )
  )
    .map(([team, objs]) => ({ team, objs }))
    .map((o) => ({
      x: o.objs.length,
      y: o.objs
        .filter(({ p }) => !p.text?.toLowerCase().includes("punt"))
        .filter(({ p }) => !p.text?.includes("field goal")).length,
      label: o.team,
    }))
    .sort((a, b) => b.y - a.y);
}
