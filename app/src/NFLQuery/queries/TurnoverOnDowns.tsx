import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "drives ending in turnover on downs inside the 5-yard line",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives
        .filter((d) => d.team === o.g.teams[o.teamIndex].name)
        .map((d) => ({
          d,
          p: ((plays) => plays[plays.length - 1])(
            d.plays.filter(window.QueryHelpers.isPlay)
          ),
        }))
        .filter(({ p }) => p)
        .map((oo) => ({
          ...oo,
          endingYardLine: oo.p.startYardsToEndzone - oo.p.distance,
          yardsNeeded: parseInt(oo.p.down?.match(/4th & (\d+)/)?.[1]!),
        }))
        .filter(
          ({ p }) =>
            ![
              "F",
              "_FumbleRecoveryOpp",
              "FGM",
              "TD",
              "BP",
              "INT",
              "PUNT",
              "BFG",
            ].includes(p.type)
        )
        .filter(({ p, yardsNeeded }) => p.distance < yardsNeeded)
        .filter(({ endingYardLine }) => endingYardLine < 100),
    mapPoints: (points) =>
      points.map((o) => ({
        x: o.extraction.p.text,
        y: o.extraction.endingYardLine,
        label: o.label,
      })),
  }),
});
