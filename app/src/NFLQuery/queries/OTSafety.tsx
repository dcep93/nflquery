import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "safeties scored in OT",
  queryFunctions: () => ({
    extract: (o) =>
      (({ drives }) =>
        o.teamIndex === 0 &&
        drives.find((d) => d.result?.toLowerCase().includes("safety"))
          ? [drives.map((d) => ({ t: d.team, r: d.result, d: d.description }))]
          : [])({
        drives: o.g.drives.filter((d, dI) =>
          d.plays?.[0]?.clock.startsWith("Q5")
        ),
      }),
    mapPoints: (points) =>
      points.map((o) => ({
        x: JSON.stringify(o.extraction),
        y: o.extraction.length,
        label: o.label,
      })),
  }),
});
