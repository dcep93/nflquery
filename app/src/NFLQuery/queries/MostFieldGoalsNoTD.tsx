import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "games with most encroachments",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : o.g.drives.find(
              (dr) => dr.plays.find((p) => p.type === "TD") !== undefined
            ) !== undefined
          ? []
          : [o.g],
    mapPoints: (points) =>
      points.map((o) => ({
        x: "x",
        y: o.extraction.drives.filter(
          (dr) => dr.plays.find((p) => p.type === "FG") !== undefined
        ).length,
        label: o.label,
      })),
  }),
});
