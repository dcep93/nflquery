import { YearBuilder } from "../Builder";
import { DataType } from "../Data";
import { isPlay, PointType } from "../Query";

export default function Year4thDown(datas: DataType[]): PointType[] {
  return YearBuilder({
    transform: (o) => o,
    filter: ({ p }) => isPlay(p) && p.down?.startsWith("4th"),
    classify: ({ p }) =>
      [
        "_MuffedPuntRecoveryOpp",
        "PUNT",
        "AFG",
        "BFG",
        "FG",
        "FGM",
        "PUNT",
        "_PuntReturn",
        "BP",
      ].includes(p.type)
        ? "kick"
        : p.type === "TD" ||
          p.startYardsToEndzone === p.distance ||
          p.distance >= parseInt(p.down.split(" ").reverse()[0])
        ? "success"
        : "failure",
    quantify: ({ grouped, filtered }) =>
      (grouped.kick || []).length / filtered.length,
    datas,
  });
}
