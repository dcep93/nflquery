import { DataType, DriveType, GameType, PlayType } from "./Data";
import { clockToSeconds, getHomeAdvantage, groupByF, PointType } from "./Query";

export type BuilderType = {
  d: DataType;
  g: GameType;
  dr: DriveType;
  dri: number;
  p: PlayType;
  pi: number;
};

// todo
export function BestInTime<T>(args: {
  transform: (o: BuilderType) => T;
  filter: (o: T) => boolean;
  map: (o: T) => PointType | null;
  datas: DataType[];
}): PointType[] {
  return args.datas
    .flatMap((d) =>
      d.games
        .map((g) => ({ g, endHomeAdvantage: getHomeAdvantage(g.scores) }))
        .flatMap(({ g, endHomeAdvantage }) =>
          g.drives.map((dr, i) => ({
            d,
            g,
            dr,
            elapsedSeconds: clockToSeconds(
              dr.plays
                .slice()
                .reverse()
                .find((p) => p.type !== "TD")!.clock
            ),
            x: dr.plays[dr.plays.length - 1].clock,
            y: (i === 0
              ? null
              : endHomeAdvantage === 0
              ? null
              : getHomeAdvantage(g.drives[i - 1].scores) *
                (endHomeAdvantage > 0 ? -1 : 1))!,
            label: `${
              g.scores[0] > g.scores[1]
                ? g.teams.map((t) => t.name).join(" @ ")
                : g.teams
                    .slice()
                    .reverse()
                    .map((t) => t.name)
                    .join(" vs ")
            } ${d.year}w${g.week}:${g.gameId}`,
          }))
        )
    )
    .filter((o) => o.y > 0)
    .sort((a, b) =>
      a.elapsedSeconds === b.elapsedSeconds
        ? b.y - a.y
        : b.elapsedSeconds - a.elapsedSeconds
    )
    .reduce(
      (prev, curr) =>
        prev.record >= curr.y
          ? prev
          : {
              record: curr.y,
              rval: prev.rval.concat({
                x: curr.x,
                y: curr.y,
                label: curr.label,
              }),
            },
      {
        record: -1,
        rval: [] as PointType[],
      }
    )
    .rval.sort((a, b) => b.y - a.y);
}

export function MaxBuilder<T>(args: {
  transform: (o: BuilderType) => T;
  filter: (o: T) => boolean;
  map: (o: T) => PointType | null;
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
    .map(args.transform)
    .filter(args.filter)
    .map(args.map)
    .filter((o) => o)
    .map((o) => o!)
    .sort((a, b) => b.y - a.y)
    .slice(0, 50);
}

export function YearBuilder<T>(args: {
  transform: (o: BuilderType) => T;
  filter: (o: T) => boolean;
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
            .map(args.transform)
            .filter(args.filter)
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
  transform: (o: BuilderType) => T;
  filter: (o: T) => boolean;
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
            .map(args.transform)
            .filter(args.filter)
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
