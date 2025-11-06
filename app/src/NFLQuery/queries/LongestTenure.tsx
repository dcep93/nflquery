import { TeamType } from "../Data";
import { PointInType } from "../Query";
import { BuildQueryConfig } from "../QueryBuilder";

type PlayerTenureExtraction = {
  player: string;
  team: string;
  latestPlayText?: string;
  latestPlayOrder?: number;
};

type PlayerPoint = PointInType<PlayerTenureExtraction>;

const suffixes = new Set([
  "jr",
  "jr.",
  "sr",
  "sr.",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
]);

type PlayerNameInfo = {
  lastNameLower: string;
  lastNameKey: string;
  firstInitial: string;
  firstNameKey: string;
  additionalPrefixKeys: string[];
};

const sanitizeToken = (token: string): string =>
  token
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const parsePlayerName = (player: string): PlayerNameInfo => {
  const tokens = player
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

  while (
    tokens.length > 1 &&
    suffixes.has(sanitizeToken(tokens[tokens.length - 1]))
  ) {
    tokens.pop();
  }

  const lastToken = tokens[tokens.length - 1] ?? "";
  const prefixTokens = tokens.slice(0, -1);
  const firstToken = tokens[0] ?? "";

  return {
    lastNameLower: lastToken.toLowerCase(),
    lastNameKey: sanitizeToken(lastToken),
    firstInitial: sanitizeToken(firstToken).charAt(0),
    firstNameKey: sanitizeToken(firstToken),
    additionalPrefixKeys: prefixTokens
      .slice(1)
      .map(sanitizeToken)
      .filter(Boolean),
  };
};

const matchesPlayer = (
  text: string,
  info: PlayerNameInfo,
  uniqueLastName: boolean
) => {
  const lower = text.toLowerCase();
  const normalized = lower.replace(/[^a-z0-9]/g, "");

  const hasLastNameRaw =
    info.lastNameLower.length > 0 && lower.includes(info.lastNameLower);
  const hasLastNameNormalized =
    info.lastNameKey.length > 0 && normalized.includes(info.lastNameKey);

  if (!hasLastNameRaw && !hasLastNameNormalized) return false;
  if (uniqueLastName) return true;

  if (
    info.firstNameKey &&
    (lower.includes(info.firstNameKey) || normalized.includes(info.firstNameKey))
  )
    return true;

  if (info.firstInitial) {
    if (hasLastNameRaw) {
      const lastIndex = lower.lastIndexOf(
        info.lastNameLower.length ? info.lastNameLower : info.lastNameKey
      );
      const searchArea = lastIndex === -1 ? lower : lower.slice(0, lastIndex);
      if (searchArea.includes(`${info.firstInitial}.`)) return true;
    }
    if (hasLastNameNormalized) {
      const lastIndexNormalized = normalized.lastIndexOf(info.lastNameKey);
      const searchNormalized =
        lastIndexNormalized === -1
          ? normalized
          : normalized.slice(0, lastIndexNormalized);
      if (searchNormalized.includes(info.firstInitial)) return true;
    }
  }

  return info.additionalPrefixKeys.some(
    (key) => key && (lower.includes(key) || normalized.includes(key))
  );
};

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

      const playerInfos = new Map<string, PlayerNameInfo>();
      const lastNameCounts = new Map<string, number>();

      Array.from(players).forEach((player) => {
        const info = parsePlayerName(player);
        playerInfos.set(player, info);
        if (info.lastNameKey) {
          lastNameCounts.set(
            info.lastNameKey,
            (lastNameCounts.get(info.lastNameKey) ?? 0) + 1
          );
        }
      });

      const teamPlays: { text: string; order: number }[] = [];
      g.drives.forEach((drive) => {
        if (drive.team !== teamName) return;
        drive.plays.forEach((play) => {
          if (!play.text) return;
          teamPlays.push({ text: play.text, order: teamPlays.length });
        });
      });

      return Array.from(players).map((player) => {
        const info = playerInfos.get(player) ?? parsePlayerName(player);
        const uniqueLastName = info.lastNameKey
          ? lastNameCounts.get(info.lastNameKey) === 1
          : false;
        let latestPlayText: string | undefined;
        let latestPlayOrder: number | undefined;

        teamPlays.forEach((play) => {
          if (matchesPlayer(play.text, info, uniqueLastName)) {
            if (
              latestPlayOrder === undefined ||
              play.order >= latestPlayOrder
            ) {
              latestPlayText = play.text;
              latestPlayOrder = play.order;
            }
          }
        });

        return {
          player,
          team: teamName,
          latestPlayText,
          latestPlayOrder,
        };
      });
    },
    mapPoints: (points: PlayerPoint[]) => {
      const playerTeams = new Map<string, Map<string, Set<string>>>();
      const latestPlays = new Map<
        string,
        { timestamp: number; order: number; text: string; label: string; team: string }
      >();

      points.forEach((point) => {
        const { player, team, latestPlayText, latestPlayOrder } =
          point.extraction;
        const playerMap =
          playerTeams.get(player) ?? new Map<string, Set<string>>();
        const teamSet = playerMap.get(team) ?? new Set<string>();
        teamSet.add(point.label);
        playerMap.set(team, teamSet);
        playerTeams.set(player, playerMap);

        if (latestPlayText) {
          const order = latestPlayOrder ?? -1;
          const currentLatest = latestPlays.get(player);
          if (
            !currentLatest ||
            point.timestamp > currentLatest.timestamp ||
            (point.timestamp === currentLatest.timestamp &&
              order > currentLatest.order)
          ) {
            latestPlays.set(player, {
              timestamp: point.timestamp,
              order,
              text: latestPlayText,
              label: point.label,
              team,
            });
          }
        }
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

        const latest = latestPlays.get(player);
        const description = `${player} played ${bestCount} games for ${bestTeam}`;
        const label = latest
          ? `${description}. Most recent play (${latest.label}): ${latest.text}`
          : description;

        return [
          {
            x: `${player} (${bestTeam})`,
            y: bestCount,
            label,
          },
        ];
      });
    },
  }),
});
