import { MaxBuilder } from "../Builder";
import { DataType } from "../Data";
import { PointType } from "../Query";

export default function GamePenalties(datas: DataType[]): PointType[] {
  return MaxBuilder({
    transform: (o) => o,
    filter: (o) => o.dri === 0 && o.pi === 0,
    map: (o) => ({
      x: o.g.gameId,
      y: o.g.drives.flatMap((dr) => dr.plays.filter((p) => p.type === "PEN"))
        .length,
      label: `${o.d.year}w${o.g.week}`,
    }),
    datas,
  });
}
