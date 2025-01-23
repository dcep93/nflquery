import Builder from "../Builder";
import { DataType } from "../Data";
import { GraphType, isPlay } from "../Query";

export default function Q1Q3_4thDown(datas: DataType[]): GraphType {
  return Builder(
    ({ dr, p }) =>
      ["Q1", "Q3"].includes(dr.plays?.[0].clock.split(" ")[0]) &&
      isPlay(p) &&
      p.down?.startsWith("4th"),
    ({ dr, p, pi }) =>
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
        : dr.plays
            .slice(pi + 1)
            .filter((pp) => isPlay(pp))
            .filter(
              (pp) =>
                ![
                  "K",
                  "XP",
                  "EP",
                  "EG",
                  "ER",
                  "SF",
                  "_TwoPointPass",
                  "_TwoPointRush",
                ].includes(pp.type)
            )
            .filter((pp) => pp.down)
            .find((pp) => pp.down.startsWith("1st")) !== undefined ||
          p.type === "TD"
        ? "success"
        : "failure",
    ({ grouped, filtered }) => (grouped.kick || []).length / filtered.length,
    datas
  );
}
