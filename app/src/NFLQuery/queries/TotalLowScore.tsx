import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "lowest final scores",
  queryFunctions: () => ({
    extract: (o) => (o.teamIndex !== 0 ? [] : [o]),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.g.scores.join(" "),
        y: -o.extraction.g.scores.reduce((a, b) => a + b, 0),
        label: o.label,
      })),
  }),
});
