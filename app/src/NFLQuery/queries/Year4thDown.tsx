import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "for each year, what happens on 4th down",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .flatMap((dr) => dr.plays.flatMap((p) => ({ o, dr, p })))
        .filter(
          ({ p }) => window.QueryHelpers.isPlay(p) && p.down?.startsWith("4th")
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
            ({ year, groupedByClassification, all4thDown }) => ({
              x:
                (groupedByClassification.kick || []).length / all4thDown.length,
              y: parseInt(year),
              label: Object.entries({ ...groupedByClassification, all4thDown })
                .map(([k, v]) => `${k}:${v.length}`)
                .join(","),
            })
          ))({
          groupedByClassificationByYear: Object.entries(groupedByYear).map(
            ([year, yearGroup]) => ({
              year,
              all4thDown: yearGroup,
              groupedByClassification: window.QueryHelpers.groupByF(
                yearGroup,
                (o) => o.classification
              ),
            })
          ),
        }))({
        groupedByYear: window.QueryHelpers.groupByF(extractions, (o) =>
          o.year.toString()
        ),
      }),
  }),
});
