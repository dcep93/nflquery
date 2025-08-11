import { getBestTeamGamePoints } from "../custom_queries/BestTeamGame";
import { DataType } from "../Data";
import { PointType } from "../Query";

export default function PuntAverages(datas: DataType[]): PointType[] {
  return getBestTeamGamePoints({
    datas,
    extract: (o) =>
      o.g.drives
        .filter((d) => d.team === o.g.teams[o.dri].name)
        .flatMap((d) => d.plays)
        .map((p) => p.text.match(/punts (\d+) yard/))
        .filter((match) => match)
        .map((match) => parseInt(match![1])),
    mapToPoint: ({ extraction, label }) =>
      extraction.length === 0
        ? null
        : {
            x: extraction.join(","),
            y: extraction.reduce((a, b) => a + b, 0) / extraction.length,
            label,
          },
  });
}
