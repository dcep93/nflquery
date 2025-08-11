import { MaxBuilder } from "../Builder";
import { DataType } from "../Data";

export default function BestTeamGame(props: { datas: DataType[] }) {
  const points = MaxBuilder({
    transform: (o) => o,
    filter: ({ dri, pi }) => dri <= 1 && pi === 0,
    map: ({ d, g, dri }) =>
      ((o) =>
        o.punts.length === 0
          ? null
          : {
              x: o.punts.join(","),
              y: o.punts.reduce((a, b) => a + b, 0) / o.punts.length,
              label: `${o.matchup} ${d.year}w${g.week}:${g.gameId}`,
            })({
        punts: g.drives
          .filter((d) => d.team === g.teams[dri].name)
          .flatMap((d) => d.plays)
          .map((p) => p.text.match(/punts (\d+) yard/))
          .filter((match) => match)
          .map((match) => parseInt(match![1])),
        matchup:
          dri === 0
            ? g.teams.map((t) => t.name).join(" @ ")
            : g.teams
                .slice()
                .reverse()
                .map((t) => t.name)
                .join(" vs "),
      }),
    ...props,
  });
  return (
    <div>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(points, null, 2)}
      </pre>
    </div>
  );
}
