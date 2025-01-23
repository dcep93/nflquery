import { DataType } from "../Data";
import { clockToSeconds, PointType } from "../Query";

export default function LongestDrive(datas: DataType[]): PointType[] {
  return datas
    .filter((d) => d.year >= 2022)
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.drives
          .filter((dr) => dr.description)
          .map((dr) => ({
            d,
            g,
            dr,
            x: dr.plays.length,
            y: clockToSeconds(dr.description.split(" ").reverse()[0]),
            label: `${dr.description}/${d.year}w${g.week}:${g.gameId}`,
          }))
      )
    )
    .map(({ x, y, label }) => ({ x, y, label }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}
