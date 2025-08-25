import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "overtime games with a single drive with few plays",
  queryFunctions: () => ({
    extract: (o) =>
      ((drives) =>
        drives.length === 1 && drives[0].team === o.g.teams[o.teamIndex].name
          ? [drives]
          : [])(
        o.g.drives.filter((d) => d.plays.find((p) => p.clock.startsWith("Q5")))
      ),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction
          .flatMap((d) => d.plays)
          .map((p) => p.text)
          .join("///"),
        y: -o.extraction
          .flatMap((d) => d.plays)
          .filter(window.QueryHelpers.isPlay).length,
        label: o.label,
      })),
  }),
});
