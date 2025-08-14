import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "highest score total in a game",
  queryFunctions: () => ({
    extract: (o) => (o.teamIndex !== 0 ? [] : [o.g.scores]),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.join(" "),
        y: o.extraction.reduce((a, b) => a + b),
        label: o.label,
      })),
  }),
});
