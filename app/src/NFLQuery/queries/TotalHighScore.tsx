import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "highest score total in a game",
  queryFunctions: () => ({
    extract: (o) => (o.teamIndex !== 0 ? [] : [o.g.scores]),
    mapToPoint: (o) => ({
      x: o.extraction.join(" "),
      y: o.extraction.reduce((a, b) => a + b),
      label: o.label,
    }),
    transform: (points) => points,
  }),
});
