import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "1st & 1 plays (excluding non-plays)",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : [
            o.g.drives.flatMap((d) =>
              d.plays.filter(
                (p) => p.down === "1st & 1" && window.QueryHelpers.isPlay(p)
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
