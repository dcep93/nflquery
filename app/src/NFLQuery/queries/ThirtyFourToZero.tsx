import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "what was the result of every game that saw a score of 34-0",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : (({ found }) => (found ? [{ found, o }] : []))({
            found: o.g.drives.find(
              (dr) =>
                (dr.scores[0] === 0 && dr.scores[1] === 34) ||
                (dr.scores[0] === 34 && dr.scores[1] === 0)
            ),
          }),
    mapPoints: (points) =>
      window.QueryHelpers.groupByF(points, (point) =>
        window.QueryHelpers.homeIsWinning(point.extraction.found.scores) ===
        window.QueryHelpers.homeIsWinning(point.extraction.o.g.scores)
          ? "stomp"
          : "upset"
      ).map(({ key, group }) => ({
        x: "point",
        y: group.length,
        label: key,
      })),
  }),
});
