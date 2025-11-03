import { BuildQueryConfig } from "../QueryBuilder";

export default BuildQueryConfig({
  tooltip: "most touchdowns scored by a team in a single game",
  queryFunctions: () => ({
    extract: ({ g, teamIndex }) => {
      let previousScores: [number, number] = [0, 0];
      const teamNames = g.teams.map((team) => team.name);
      const touchdowns = g.drives.reduce((total, drive) => {
        const currentScores = drive.scores as [number, number];
        const scoreDeltaTeam0 = currentScores[0] - previousScores[0];
        const scoreDeltaTeam1 = currentScores[1] - previousScores[1];
        previousScores = currentScores;

        if (!drive.result.includes("Touchdown")) {
          return total;
        }

        const scoringTeamFromScores =
          scoreDeltaTeam0 !== scoreDeltaTeam1
            ? scoreDeltaTeam0 > scoreDeltaTeam1
              ? 0
              : 1
            : null;

        if (scoringTeamFromScores !== null) {
          return scoringTeamFromScores === teamIndex ? total + 1 : total;
        }

        const offenseIndex = teamNames.indexOf(drive.team);
        const opponentIndex =
          offenseIndex === -1 ? null : offenseIndex === 0 ? 1 : 0;
        const resultLower = drive.result.toLowerCase();
        const isOpponentTouchdown =
          resultLower.includes("interception touchdown") ||
          resultLower.includes("fumble touchdown") ||
          resultLower.includes("fumble return touchdown") ||
          resultLower.includes("return touchdown") ||
          resultLower.includes("blocked punt touchdown") ||
          resultLower.includes("blocked fg touchdown") ||
          resultLower.includes("punt touchdown") ||
          resultLower.includes("kickoff return touchdown");

        const fallbackTeamIndex = isOpponentTouchdown
          ? opponentIndex
          : offenseIndex;

        return fallbackTeamIndex === teamIndex ? total + 1 : total;
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
