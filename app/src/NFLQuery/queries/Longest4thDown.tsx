import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "longest 4th downs",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .filter((dr) => dr.team === o.g.teams[o.teamIndex].name)
        .flatMap((d) => d.plays)
        .filter(window.QueryHelpers.isPlay)
        .filter((p) => p.type !== "PUNT")
        .map((p) => ({ p, match: p.down?.match(/4th & (\d+)/) }))
        .filter(({ match }) => match),
    mapPoints: (points) =>
      points.map((o) => ({
        x: `${o.extraction.p.down} [${o.extraction.p.clock} ${o.extraction.p.startYardsToEndzone} YdLn] ${o.extraction.p.text}`,
        y: parseInt(o.extraction.match![1]),
        label: o.label,
      })),
  }),
});
