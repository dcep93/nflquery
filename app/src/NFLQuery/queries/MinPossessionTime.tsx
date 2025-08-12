import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "min game possession time",
  queryFunctions: () => ({
    extract: (o) =>
      (({ rawPossessionTime }) =>
        rawPossessionTime === undefined
          ? []
          : [
              {
                o,
                rawPossessionTime,
              },
            ])({
        rawPossessionTime: o.g.teams[o.teamIndex].statistics.possessionTime,
      }),
    mapToPoint: (o) => ({
      x: o.extraction.rawPossessionTime,
      y: window.QueryHelpers.clockToSeconds(o.extraction.rawPossessionTime),
      label: `${o.extraction.o.g.scores.join(" ")} / ${o.label}`,
    }),
    transform: (points) => points,
  }),
});
