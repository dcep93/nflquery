import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "games with most penalties",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : [
            o.g.drives.flatMap((dr) =>
              dr.plays.filter((p) => p.type === "PEN")
            ),
          ],
    mapToPoint: (o) => ({
      x: o.timestamp,
      y: o.extraction.length,
      label: o.label,
    }),
    transform: (points) => points,
  }),
});
