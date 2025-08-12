import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "highest score by a team",
  queryFunctions: () => ({
    extract: (o) => [{ scores: o.g.scores, teamIndex: o.teamIndex }],
    mapToPoint: (o) => ({
      x: o.extraction.scores.join(" "),
      y: o.extraction.scores[o.extraction.teamIndex],
      label: o.label,
    }),
    transform: (points) => points,
  }),
});
