import { DataType, DriveType, GameType, PlayType } from "./Data";
import { GraphType, groupByF } from "./Query";

export type BuilderType = {
  d: DataType;
  g: GameType;
  dr: DriveType;
  p: PlayType;
  pi: number;
};

export default function Builder(
  filter: (o: BuilderType) => boolean,
  classify: (o: BuilderType) => string,
  quantify: (o: {
    filtered: BuilderType[];
    grouped: { [key: string]: BuilderType[] };
  }) => number,
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
            .filter(filter)
        )
      ),
    }))
    .map((o) => ({
      ...o,
      grouped: groupByF(o.filtered, (oo) => classify(oo)),
    }))
    .map((o) => ({
      x: o.d.year,
      y: quantify(o),
      label: `${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.filtered.length}`,
    }));
}
