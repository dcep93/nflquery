import { DataType } from "../Data";

export default function Q1Q3_4thDown(datas: DataType[]) {
  // return YearBuilder({
  //   transform: (o) => o,
  //   filter: ({ dr, p }) =>
  //     ["Q1", "Q3"].includes(dr.plays?.[0].clock.split(" ")[0]) &&
  //     isPlay(p) &&
  //     p.down?.startsWith("4th"),
  //   classify: ({ p }) =>
  //     [
  //       "_MuffedPuntRecoveryOpp",
  //       "PUNT",
  //       "AFG",
  //       "BFG",
  //       "FG",
  //       "FGM",
  //       "PUNT",
  //       "_PuntReturn",
  //       "BP",
  //     ].includes(p.type)
  //       ? "kick"
  //       : p.type === "TD" ||
  //         p.startYardsToEndzone === p.distance ||
  //         p.distance >= parseInt(p.down.split(" ").reverse()[0])
  //       ? "success"
  //       : "failure",
  //   quantify: ({ grouped, filtered }) =>
  //     (grouped.kick || []).length / filtered.length,
  //   datas,
  // });
}
