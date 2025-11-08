import { allYears, endYear } from "./constants";
import { fetchCompletedGameIds, fetchSummaryGame } from "./fetchYear";
import { DataType } from "./types";

export type {
  BoxScoreType,
  DataType,
  DriveType,
  GameType,
  PlayType,
  TeamStatistic,
  TeamType,
} from "./types";

const wasHardRefresh =
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
    ?.type === "reload";

export default async function Data(): Promise<DataType[]> {
  const cache = await caches.open("data");
  const results = await Promise.all(
    allYears.map((year) => fetchYearData(year, cache))
  );
  return results;
}

async function fetchYearData(year: number, cache: Cache): Promise<DataType> {
  const cacheKey = year.toString();
  const url = `https://dcep93.github.io/nflquery/data_v6/${cacheKey}.json`;

  let response: Response | undefined;

  if (!(wasHardRefresh && year === endYear)) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse?.url === url) {
      response = cachedResponse;
    }
  }

  if (!response) {
    const fetched = await fetch(url, { cache: "no-cache" });
    if (!fetched.ok) {
      throw new Error(`${year}: ${fetched.status}`);
    }
    await cache.put(cacheKey, fetched.clone());
    response = fetched;
  }

  const data = (await response.json()) as DataType;

  if (year !== endYear) {
    return data;
  }

  return ensureCurrentYearData(data, cache, cacheKey);
}

async function ensureCurrentYearData(
  data: DataType,
  cache: Cache,
  cacheKey: string
): Promise<DataType> {
  const completedGameIds = await fetchCompletedGameIds(data.year);
  const knownGames = new Map(data.games.map((game) => [game.gameId, game]));

  const missingGameIds = completedGameIds.filter(
    (gameId) => !knownGames.has(gameId)
  );

  if (!missingGameIds.length) {
    return data;
  }

  const newGames = await Promise.all(
    missingGameIds.map((gameId) => fetchSummaryGame(gameId))
  );

  newGames.forEach((game) => {
    knownGames.set(game.gameId, game);
  });

  const mergedGames = Array.from(knownGames.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const updatedData: DataType = {
    ...data,
    games: mergedGames,
  };

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(updatedData), {
      headers: { "Content-Type": "application/json" },
    })
  );

  return updatedData;
}
