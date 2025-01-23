import Builder from "../Builder";
import { DataType } from "../Data";
import { GraphType, isPlay } from "../Query";

export default function Q1Q3_4thDown(datas: DataType[]): GraphType {
  return Builder(
    ({ dr, p }) =>
      ["Q1", "Q3"].includes(dr.plays?.[0].clock.split(" ")[0]) &&
      isPlay(p) &&
      p.down?.startsWith("4th"),
    ({ p }) =>
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
    ({ grouped, filtered }) => (grouped.kick || []).length / filtered.length,
    datas
  );
}
