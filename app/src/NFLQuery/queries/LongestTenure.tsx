import { TeamType } from "../Data";
import { PointInType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

type PlayerTenureExtraction = {
  player: string;
  team: string;
};

type PlayerPoint = PointInType<PlayerTenureExtraction>;

export default BuildQueryConfig({
  tooltip: "Players with the most games played for a single franchise",
  queryFunctions: () => ({
    extract: ({ g, teamIndex }) => {
      const team = g.teams[teamIndex] as TeamType;
      const teamName = team.name;
      const players = new Set<string>();

      team.boxScore.forEach((category) => {
        category.players.forEach(({ name }) => {
          players.add(name);
        });
      });

      return Array.from(players).map((player) => ({
        player,
        team: teamName,
      }));
    },
    mapPoints: (points: PlayerPoint[]) => {
      const playerTeams = new Map<string, Map<string, Set<string>>>();

      points.forEach((point) => {
        const { player, team } = point.extraction;
        const playerMap =
          playerTeams.get(player) ?? new Map<string, Set<string>>();
        const teamSet = playerMap.get(team) ?? new Set<string>();
        teamSet.add(point.label);
        playerMap.set(team, teamSet);
        playerTeams.set(player, playerMap);
      });

      return Array.from(playerTeams.entries()).flatMap(([player, teams]) => {
        let bestTeam = "";
        let bestCount = 0;

        teams.forEach((games, team) => {
          const count = games.size;
          if (count > bestCount || (count === bestCount && team < bestTeam)) {
            bestTeam = team;
            bestCount = count;
          }
        });

        if (!bestTeam) return [];

        return [
          {
            x: `${player} (${bestTeam})`,
            y: bestCount,
            label: `${player} played ${bestCount} games for ${bestTeam}`,
          },
        ];
      });
    },
  }),
});
