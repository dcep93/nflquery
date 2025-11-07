import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "total fantasy points scored in a game",
  queryFunctions: () => ({
    extract: (e) =>
      e.teamIndex !== 0
        ? []
        : [
            window.QueryHelpers
              .groupByF(
                Object.values(e.g.teams).flatMap((team) =>
                  team.boxScore
                    .map((boxScore) =>
                      boxScore.labels.map((label, labelIndex) => ({
                        label,
                        category: boxScore.category,
                        stats: boxScore.players.map((p) => ({
                          player: p.name,
                          stat: parseInt(p.stats[labelIndex]),
                        })),
                      }))
                    )
                    .flatMap((labels) =>
                      labels.flatMap((l) =>
                        l.stats.map((s) => ({
                          player: s.player,
                          points:
                            s.stat *
                            (
                              {
                                passing: { YDS: 0.04, TD: 4, INT: -2 },
                                rushing: { YDS: 0.1, TD: 6 },
                                receiving: { REC: 1, YDS: 0.1, TD: 6 },
                                fumbles: { LOST: -2, REC: 2 },
                                defensive: { SACKS: 1, TD: 6 },
                                interceptions: { INT: 2, TD: 0 },
                                kickReturns: { TD: 6 },
                                puntReturns: { TD: 6 },
                                kicking: { FG: 4, XP: 1 },
                              } as Record<string, Record<string, number>>
                            )[l.category]?.[l.label],
                        }))
                      )
                    )
                )
                  .filter((entry) => !Number.isNaN(entry.points)),
                (obj) => obj.player
              )
              .map((obj) => ({
                player: obj.key,
                points: obj.group.map((g) => g.points).reduce((a, b) => a + b, 0),
              }))
              .filter((obj) => obj.points !== 0)
              .sort((a, b) => b.points - a.points),
          ],
    mapPoints: (e) =>
      e.map((e) => ({
        x: e.extraction
          .map((obj) => `${obj.player}:${Number(obj.points.toFixed(2))}`)
          .join("/"),
        y: e.extraction.map((obj) => obj.points).reduce((a, b) => a + b, 0),
        label: e.label,
      })),
  }),
});
