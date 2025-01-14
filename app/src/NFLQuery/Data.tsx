import debug2024 from "./2024.json";

export default function Data(years: number[]): Promise<DataType[]> {
  return Promise.resolve([debug2024 as unknown as DataType]);
}

export type DataType = {
  year: number;
  games: GameType[];
};

export type GameType = {
  gameId: number;
  week: number; // -1 for postseason
  timestamp: number;
  teams: {
    name: string;
    statistics: { [key in TeamStatistic]?: string };
    boxScore: BoxScoreType[];
  }[];
  playByPlay: DriveType[];
};

export enum TeamStatistic {
  firstDowns,
  firstDownsPassing,
  firstDownsRushing,
  firstDownsPenalty,
  thirdDownEff,
  fourthDownEff,
  totalOffensivePlays,
  totalYards,
  yardsPerPlay,
  totalDrives,
  netPassingYards,
  completionAttempts,
  yardsPerPass,
  interceptions,
  sacksYardsLost,
  rushingYards,
  rushingAttempts,
  yardsPerRushAttempt,
  redZoneAttempts,
  totalPenaltiesYards,
  turnovers,
  fumblesLost,
  defensiveTouchdowns,
  possessionTime,
}

export type DriveType = {
  team: string;
  description: string;
  result: string;
  plays: PlayType[];
  homeAdvantage: number;
};

export type PlayType = {
  down: string;
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
