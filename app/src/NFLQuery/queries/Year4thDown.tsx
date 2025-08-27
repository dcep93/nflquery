import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "for each year, what happens on 4th down",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .flatMap((dr) => dr.plays.flatMap((p) => ({ o, dr, p })))
        .filter(
          ({ dr, p }) =>
            window.QueryHelpers.isPlay(p) && p.down?.startsWith("4th")
        )
        .map(({ o, p }) => ({
          year: o.d.year,
          classification: [
            "_MuffedPuntRecoveryOpp",
            "PUNT",
            "AFG",
            "BFG",
            "FG",
            "FGM",
            "PUNT",
            "_PuntReturn",
            "BP",
          ].includes(p.type)
            ? "_kick"
            : p.type === "TD" ||
                p.startYardsToEndzone === p.distance ||
                p.distance >= parseInt(p.down.split(" ").reverse()[0])
              ? "success"
              : "failure",
        })),
    mapPoints: (o) =>
      (({ groupedByYear }) =>
        (({ groupedByClassificationByYear }) =>
          groupedByClassificationByYear.map(
            ({ key, groupedByClassification, group }) => ({
              x: `kick ratio: ${
                (
                  groupedByClassification.find(({ key }) => key === "_kick")
                    ?.group || []
                ).length / group.length
              }`,
              y: key,
              label: groupedByClassification
                .concat({ key: "total", group })
                .map((g) => `${g.key}:${g.group.length}`)
                .join(","),
            })
          ))({
          groupedByClassificationByYear: groupedByYear.map(
            ({ key, group }) => ({
              key,
              group,
              groupedByClassification: window.QueryHelpers.groupByF(
                group,
                (oo) => oo.classification
              ).sort((a, b) => (a.key > b.key ? 1 : -1)),
            })
          ),
        }))({
        groupedByYear: window.QueryHelpers.groupByF(
          o.map((oo) => oo.extraction),
          (oo) => oo.year
        ),
      }),
  }),
});
