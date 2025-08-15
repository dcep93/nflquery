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
      points.map((point) => ({
        x: `${point.extraction.found.plays[0].clock} ${point.extraction.o.g.scores.join(" ")}`,
        label: point.label,
        y: point.extraction.o.g.scores[
          window.QueryHelpers.homeIsWinning(point.extraction.found.scores)
            ? 1
            : 0
        ],
      })),
  }),
});
