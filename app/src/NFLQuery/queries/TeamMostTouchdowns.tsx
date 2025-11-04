import { TeamType } from "../Data";
import { PointInType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "most touchdowns scored by a team in a single game",
  queryFunctions: () => ({
    extract: ({ g, teamIndex }) => [g.teams[teamIndex]],
    mapPoints: (points) =>
      Object.entries(
        points.reduce(
          (prev, curr) => {
            const thisNum = curr.extraction.boxScore
              // dont double count passers
              .filter((boxScore) => boxScore.category !== "passing")
              .map((b) => ({ b, index: b.labels.indexOf("TD") }))
              .flatMap(({ b, index }) =>
                b.players.map((p) => parseInt(p.stats[index]) || 0)
              )
              .reduce((a, b) => a + b, 0);
            if (thisNum > prev[curr.extraction.name].best) {
              prev[curr.extraction.name] = { best: thisNum, arr: [curr] };
            } else if (thisNum === prev[curr.extraction.name].best) {
              prev[curr.extraction.name].arr.push(curr);
            }
            return prev;
          },
          Object.fromEntries(
            Array.from(new Set(points.flatMap((p) => p.extraction.name))).map(
              (teamName) => [
                teamName,
                { best: -1, arr: [] as PointInType<TeamType>[] },
              ]
            )
          )
        )
      ).map(([x, o]) => ({
        x,
        y: o.best,
        label: o.arr.map((a) => a.label).join(" / "),
      })),
  }),
});
