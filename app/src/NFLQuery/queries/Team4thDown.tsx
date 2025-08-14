import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "how many times does each team run a play on 4th down",
  queryFunctions: () => ({
    extract: (o) =>
      o.teamIndex !== 0
        ? []
        : o.g.drives.flatMap((dr) =>
            dr.plays
              .filter((p) => p.down?.startsWith("4th"))
              .filter((p) => window.QueryHelpers.isPlay(p))
              .map((p) => ({ o, dr, p }))
          ),
    mapPoints: (points) =>
      window.QueryHelpers.groupByF(
        points,
        (point) => point.extraction.dr.team
      ).map(({ key, group }) => ({
        x: group.length,
        y: group
          .filter(
            ({ extraction }) =>
              !extraction.p.text?.toLowerCase().includes("punt")
          )
          .filter(
            ({ extraction }) => !extraction.p.text?.includes("field goal")
          ).length,
        label: key,
      })),
  }),
});
