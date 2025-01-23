import { MaxBuilder } from "../Builder";
import { DataType } from "../Data";
import { clockToSeconds, PointType } from "../Query";

export default function LongestDrive(datas: DataType[]): PointType[] {
  return MaxBuilder({
    filter: ({ dr }) => dr.description !== undefined,
    map: ({ d, g, dr }) => ({
      x: dr.plays.length,
      y: clockToSeconds(dr.description.split(" ").reverse()[0]),
      label: `${dr.description}/${d.year}w${g.week}:${g.gameId}`,
    }),
    datas,
  });
}
