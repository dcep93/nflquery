import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "for each year, what happens on 4th down during Q1,Q3",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .flatMap((dr) => dr.plays.flatMap((p) => ({ o, dr, p })))
        .filter(
          ({ dr, p }) =>
            ["Q1", "Q3"].includes(dr.plays?.[0].clock.split(" ")[0]) &&
            window.QueryHelpers.isPlay(p) &&
            p.down?.startsWith("4th")
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
            ? "kick"
            : p.type === "TD" ||
              p.startYardsToEndzone === p.distance ||
              p.distance >= parseInt(p.down.split(" ").reverse()[0])
            ? "success"
            : "failure",
        })),
    mapToPoint: (o) => o.extraction,
    transform: (extractions) =>
      (({ groupedByYear }) =>
        (({ groupedByClassificationByYear }) =>
          groupedByClassificationByYear.map(
            ({ key, groupedByClassification, group }) => ({
              x:
                (
                  groupedByClassification.find(({ key }) => key === "kick")
                    ?.group || []
                ).length / group.length,
              y: key,
              label: Object.entries({ ...groupedByClassification, group })
                .map(([k, v]) => `${k}:${group.length}`)
                .join(","),
            })
          ))({
          groupedByClassificationByYear: groupedByYear.map(
            ({ key, group }) => ({
              key,
              group,
              groupedByClassification: window.QueryHelpers.groupByF(
                group,
                (o) => o.classification
              ),
            })
          ),
        }))({
        groupedByYear: window.QueryHelpers.groupByF(extractions, (o) => o.year),
      }),
  }),
});
