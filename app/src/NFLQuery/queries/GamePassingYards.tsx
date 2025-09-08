import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "most passing yards for a player in a game",
  queryFunctions: () => ({
    extract: (o) =>
      (({ bs }) =>
        (({ index }) =>
          bs.players.map((p) => ({ p, value: parseFloat(p.stats[index]) })))({
          index: bs.labels.findIndex((l) => l === "netPassingYards"),
        }))({
        bs: o.g.teams[o.teamIndex].boxScore.find(
          ({ category }) => category === "passing"
        )!,
      }),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.p.name,
        y: o.extraction.value,
        label: o.label,
      })),
  }),
});
