import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "longest distance to march down the field to steal the game",
  queryFunctions: () => ({
    extract: (o) =>
      [o.g]
        .map((g) => g.scores.reduce((a, b) => a + b, 0))
        .map((endScore) => ({
          endScore,
          homeIsWinning: window.QueryHelpers.getHomeAdvantage(o.g.scores) > 0,
          finalScoringDrive: o.g.drives
            .map((dr, dri) => ({
              dr,
              dri,
              drScore: dr.scores.reduce((a, b) => a + b, 0),
            }))
            .find(({ drScore }) => drScore === endScore)!,
        }))
        .filter(({ homeIsWinning }) => (o.teamIndex !== 0) === homeIsWinning)
        .filter(
          (oo) =>
            oo.finalScoringDrive?.dri > 0 &&
            oo.homeIsWinning ===
              window.QueryHelpers.getHomeAdvantage(
                o.g.drives[oo.finalScoringDrive.dri - 1].scores
              ) <
                0
        )
        .filter(
          (oo) => !oo.finalScoringDrive.dr.plays[0].clock.startsWith("Q5")
        )
        .map((oo) => ({
          ...oo,
          yards: oo.finalScoringDrive.dr.plays[0].startYardsToEndzone,
          remainingSeconds:
            window.QueryHelpers.totalGameSeconds -
            window.QueryHelpers.clockToSeconds(
              oo.finalScoringDrive.dr.plays[0].clock
            ),
          x: oo.finalScoringDrive.dr.plays[0].clock,
        })),
    mapToPoint: (o) => o,
    transform: (points) =>
      points
        .sort(
          (a, b) =>
            b.extraction.remainingSeconds - a.extraction.remainingSeconds
        )
        .sort((a, b) => b.extraction.yards - a.extraction.yards)
        .reduce(
          (prev, curr) =>
            prev.record >= curr.extraction.remainingSeconds
              ? {
                  ...prev,
                  slowers: prev.slowers.concat(
                    `${curr.extraction.x}=${curr.extraction.yards}=${curr.label}`
                  ),
                }
              : {
                  slowers: [],
                  record: curr.extraction.remainingSeconds,
                  rval: prev.rval.concat({
                    ...curr,
                    label: `${curr.label}//${prev.slowers}`,
                    extraction: {
                      ...curr.extraction,
                      x: `${curr.extraction.x} (${prev.slowers.length} more but slower)`,
                    },
                  }),
                },
          {
            slowers: [] as string[],
            record: -1,
            rval: [] as typeof points,
          }
        )
        .rval.map((point) => ({
          x: point.extraction.x,
          y: point.extraction.yards,
          label: point.label,
        })),
  }),
});
