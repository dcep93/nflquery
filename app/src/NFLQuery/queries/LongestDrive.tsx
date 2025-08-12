import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "longest drive durations",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : o.g.drives
            .filter((dr) => dr.description)
            .map((dr) => ({
              description: dr.description,
              seconds: window.QueryHelpers.clockToSeconds(
                dr.description.split(" ").reverse()[0]
              ),
            })),

    mapToPoint: (o) => ({
      x: o.extraction.description,
      y: o.extraction.seconds,
      label: o.label,
    }),
    transform: (points) => points,
  }),
});
