const startYear = 2005;
export const endYear = 2025;
export const allYears = Array.from(new Array(endYear - startYear + 1)).map(
  (_, i) => startYear + i
);

const wasHardRefresh =
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
    ?.type === "reload";

export default function Data(): Promise<DataType[]> {
  return Promise.resolve()
    .then(() => caches.open("data"))
    .then((cache) =>
      allYears
        .map((year) => year.toString())
        .map((year) => ({
          year,
          url: `https://dcep93.github.io/nflquery/data_v6/${year}.json`,
        }))
        .map(({ year, url }) =>
          Promise.resolve()
            // .then(() => cache.delete(year))
            .then(() =>
              wasHardRefresh && year === endYear.toString()
                ? undefined
                : cache.match(year)
            )
            .then((cachedResponse) =>
              cachedResponse?.url === url
                ? cachedResponse?.json()
                : Promise.resolve()
                    .then(() => fetch(url, { cache: "no-cache" }))
                    .then((resp) =>
                      !resp.ok
                        ? (() => {
                            throw new Error(resp.status.toString());
                          })()
                        : Promise.resolve()
                            .then(() => cache.put(year, resp.clone()))
                            .then(() => resp.json())
                    )
                    .catch((err) =>
                      (() => {
                        throw new Error(`${year}: ${err}`);
                      })()
                    )
            )
            .then((data) => data as DataType)
        )
    )
    .then((ps) => Promise.all(ps));
}

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
