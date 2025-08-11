import { DataType, DriveType, GameType, PlayType } from "./Data";
import { groupByF, PointType } from "./Query";

export type BuilderType = {
  d: DataType;
  g: GameType;
  dr: DriveType;
  dri: number;
  p: PlayType;
  pi: number;
};

export function MaxBuilder<T>(args: {
  filter: (o: BuilderType) => boolean;
  extract: (o: BuilderType) => T;
  mapToPoint: (o: T) => PointType | null;
  datas: DataType[];
}): PointType[] {
  return args.datas
    .flatMap((d) =>
      d.games.flatMap((g) =>
        g.drives.flatMap((dr, dri) =>
          dr.plays.map((p, pi) => ({
            d,
            g,
            dr,
            dri,
            p,
            pi,
          }))
        )
      )
    )
    .filter(args.filter)
    .map(args.extract)
    .map(args.mapToPoint)
    .filter((o) => o)
    .map((o) => o!)
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}

export function YearBuilder<T>(args: {
  filter: (o: BuilderType) => boolean;
  extract: (o: BuilderType) => T;
  classify: (o: T) => string;
  quantify: (o: { filtered: T[]; grouped: { [key: string]: T[] } }) => number;
  datas: DataType[];
}): PointType[] {
  return args.datas
    .map((d) => ({
      d,
      filtered: d.games.flatMap((g) =>
        g.drives.flatMap((dr, dri) =>
          dr.plays
            .map((p, pi) => ({
              d,
              g,
              dr,
              dri,
              p,
              pi,
            }))
            .filter(args.filter)
            .map(args.extract)
        )
      ),
    }))
    .map((o) => ({
      ...o,
      grouped: groupByF(o.filtered, (oo) => args.classify(oo)),
    }))
    .map((o) => ({
      x: o.d.year,
      y: args.quantify(o),
      label: `${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.filtered.length}`,
    }));
}

export function PointBuilder<T>(args: {
  filter: (o: BuilderType) => boolean;
  extract: (o: BuilderType) => T;
  classify: (o: T) => string;
  quantify: (o: { filtered: T[]; grouped: { [key: string]: T[] } }) => number;
  datas: DataType[];
}): PointType[] {
  return [
    args.datas.flatMap((d) =>
      d.games.flatMap((g) =>
        g.drives.flatMap((dr, dri) =>
          dr.plays
            .map((p, pi) => ({
              d,
              g,
              dr,
              dri,
              p,
              pi,
            }))
            .filter(args.filter)
            .map(args.extract)
        )
      )
    ),
  ]
    .map((filtered) => ({
      filtered,
      grouped: groupByF(filtered, (oo) => args.classify(oo)),
    }))
    .map((o) => ({
      x: "point",
      y: args.quantify(o),
      label: `${Object.entries(o.grouped)
        .map(([k, v]) => `${k}:${v.length}`)
        .sort()
        .join(",")}/${o.filtered.length}`,
    }));
}
