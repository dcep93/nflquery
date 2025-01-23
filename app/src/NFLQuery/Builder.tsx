import { DataType, DriveType, GameType, PlayType } from "./Data";
import { GraphType, groupByF } from "./Query";

type BuilderType = {
  d: DataType;
  g: GameType;
  dr: DriveType;
  p: PlayType;
  pi: number;
};

export default function Builder(
  filterA: (o: BuilderType) => boolean,
  classify: (o: BuilderType) => string,
  datas: DataType[]
): GraphType {
  return datas
    .map((d) => ({
      d,
      filtered: d.games.flatMap((g) =>
        g.drives.flatMap((dr) =>
          dr.plays
            .map((p, pi) => ({
              d,
              g,
              dr,
              p,
              pi,
            }))
            .filter(filterA)
        )
      ),
    }))
    .map((o) => ({
      ...o,
      grouped: groupByF(o.filtered, (oo) => classify(oo)),
    }))
    .map((o) => ({
      x: o.d.year,
      y: o.grouped.kick.length / o.filtered.length,
      label: `${o.d.year}/${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.filtered.length}`,
    }));
}
