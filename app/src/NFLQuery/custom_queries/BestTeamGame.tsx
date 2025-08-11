import { BuilderType, MaxBuilder } from "../Builder";
import { DataType } from "../Data";
import { PointType } from "../Query";

export function getBestTeamGamePoints<T>(args: {
  datas: DataType[];
  extract: (o: BuilderType) => T;
  mapToPoint: (x: {
    o: BuilderType;
    label: string;
    extraction: T;
  }) => PointType | null;
}): PointType[] {
  return MaxBuilder({
    filter: ({ dri, pi }) => dri <= 1 && pi === 0,
    extract: (o) => ({
      o,
      label: ((matchup) => `${matchup} ${o.d.year}w${o.g.week}:${o.g.gameId}`)(
        ((teams) =>
          o.dri === 0
            ? teams.map((t) => t.name).join(" @ ")
            : teams
                .slice()
                .reverse()
                .map((t) => t.name)
                .join(" vs "))(o.g.teams)
      ),
      extraction: args.extract(o),
    }),
    mapToPoint: args.mapToPoint,
    datas: args.datas,
  });
}

export default function BestTeamGame(props: { datas: DataType[] }) {
  const points = getBestTeamGamePoints({
    datas: props.datas,
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
  return (
    <div>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(points, null, 2)}
      </pre>
    </div>
  );
}
