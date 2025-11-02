import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "most touchdowns scored by a team in a single game",
  queryFunctions: () => ({
    extract: ({ g, teamIndex }) => {
      let previousScores: [number, number] = [0, 0];
      const touchdowns = g.drives.reduce((total, drive) => {
        const currentScores = drive.scores as [number, number];
        const scoreDeltaTeam0 = currentScores[0] - previousScores[0];
        const scoreDeltaTeam1 = currentScores[1] - previousScores[1];
        previousScores = currentScores;

        if (!drive.result.includes("Touchdown")) {
          return total;
        }

        const scoringTeamIndex =
          scoreDeltaTeam0 > scoreDeltaTeam1
            ? 0
            : scoreDeltaTeam1 > scoreDeltaTeam0
            ? 1
            : null;

        return scoringTeamIndex === teamIndex ? total + 1 : total;
      }, 0);

      return [
        {
          touchdowns,
        },
      ];
    },
    mapPoints: (points) =>
      points.map((point) => ({
        x: point.extraction.touchdowns,
        y: point.extraction.touchdowns,
        label: point.label,
      })),
  }),
});
