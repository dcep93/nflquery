import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "most receptions",
  queryFunctions: () => ({
    extract: (o) =>
      [
        o.g.teams[o.teamIndex].boxScore.find(
          ({ category }) => category === "receiving"
        )!,
      ]
        .map((boxScore) => ({
          boxScore,
          index: boxScore.labels.indexOf("REC"),
        }))
        .flatMap(({ boxScore, index }) =>
          boxScore.players.map(({ name, stats }) => ({
            x: `${name} - ${boxScore.labels} ${stats}`,
            y: stats[index],
          }))
        ),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.x,
        y: Number(o.extraction.y),
        label: o.label,
      })),
  }),
});
