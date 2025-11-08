export type DataType = {
  year: number;
  games: GameType[];
};

export type TeamType = {
  name: string;
  statistics: { [key in TeamStatistic]?: string };
  boxScore: BoxScoreType[];
};

export type GameType = {
  gameId: number;
  week: number; // -1 for postseason
  timestamp: number;
  teams: TeamType[];
  drives: DriveType[];
  scores: [number, number];
};

export type TeamStatistic =
  | "firstDowns"
  | "firstDownsPassing"
  | "firstDownsRushing"
  | "firstDownsPenalty"
  | "thirdDownEff"
  | "fourthDownEff"
  | "totalOffensivePlays"
  | "totalYards"
  | "yardsPerPlay"
  | "totalDrives"
  | "netPassingYards"
  | "completionAttempts"
  | "yardsPerPass"
  | "interceptions"
  | "sacksYardsLost"
  | "rushingYards"
  | "rushingAttempts"
  | "yardsPerRushAttempt"
  | "redZoneAttempts"
  | "totalPenaltiesYards"
  | "turnovers"
  | "fumblesLost"
  | "defensiveTouchdowns"
  | "possessionTime";

export type DriveType = {
  team: string;
  description: string;
  result: string;
  plays: PlayType[];
  scores: [number, number];
};

export type PlayType = {
  down: string;
  type: string;
  text: string;
  clock: string;
  distance: number;
  startYardsToEndzone: number;
};

export type BoxScoreType = {
  category: string;
  labels: string[];
  players: { name: string; stats: string[] }[];
};
