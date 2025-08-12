import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "count penalties",
  queryFunctions: () => ({
    extract: (o) =>
      o.g.drives.flatMap((dr) =>
        dr.plays
          .map((p) => ({
            p,
            m: p.text?.match(/penalty on ([A-Z]+)/i),
            safetyM: p.text?.match(/[(for a safety)|(enforced in end zone)]/i),
          }))
          .filter(({ m }) => m)
          .map(({ p, m, safetyM }) => ({
            p,
            against: safetyM ? dr.team : m![1],
          }))
          .map(({ p, against }) => ({
            p,
            against:
              {
                HST: "HOU",
                BLT: "BAL",
              }[against] || against,
          }))
          .flatMap(({ p, against }) => [
            { o, dr, p, type: "against", teamName: against },
            {
              o,
              dr,
              p,
              type: "for",
              teamName: o.g.teams.find((t) => t.name !== against)!.name,
            },
          ])
      ),
    mapToPoint: (o) => o,
    transform: (points) =>
      Object.entries(
        window.QueryHelpers.groupByF(
          points.map((o) => ({
            ...o,
            group: `${o.extraction.type} ${
              { STL: "LAR", SD: "LAC", OAK: "LV" }[o.extraction.teamName] ||
              o.extraction.teamName
            }`,
          })),
          (t) => t.group
        )
      ).map(([k, v]) => ({
        x: v.length,
        y: v
          .map((oo) => Math.abs(oo.extraction.p.distance))
          .reduce((a, b) => a + b, 0),
        label: k,
      })),
  }),
});
