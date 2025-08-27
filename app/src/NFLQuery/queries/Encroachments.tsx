import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "games with most encroachments",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : [
            o.g.drives.flatMap((dr) =>
              dr.plays.filter((p) =>
                p.text.toLowerCase().includes("encroachment")
              )
            ),
          ],
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.map((e) => e.clock).join(" / "),
        y: o.extraction.length,
        label: o.label,
      })),
  }),
});
