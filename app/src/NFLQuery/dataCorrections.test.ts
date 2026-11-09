import { readFileSync } from "fs";
import { resolve } from "path";
import type { DataType } from "./types";
import { correctGameData, correctSeasonData } from "./dataCorrections";

const season = (): DataType =>
  JSON.parse(
    readFileSync(resolve(__dirname, "../../../data_v6/2007.json"), "utf8"),
  );

test("corrections preserve unmatched values and unrelated objects", () => {
  const data = season();
  const raw = data.games.find((g) => g.gameId === 271202028)!;
  const altered = {
    ...raw,
    drives: raw.drives.map((d, i) =>
      i === 6 ? { ...d, scores: [3, 9] as [number, number] } : d,
    ),
  };
  expect(correctGameData(altered).drives[6].scores).toEqual([3, 9]);
  const corrected = correctSeasonData(data);
  expect(correctSeasonData(corrected)).toBe(corrected);
  expect(corrected.games.find((g) => g.gameId !== 271202028)).toBe(
    data.games.find((g) => g.gameId !== 271202028),
  );
});

test.each([true, false])(
  "Data applies repairs to cached or fetched season payloads (cached=%s)",
  async (cached) => {
    jest.resetModules();
    jest.doMock("./constants", () => ({ allYears: [2007], endYear: 2026 }));
    jest.doMock("./fetchYear", () => ({
      fetchCompletedGameIds: jest.fn(),
      fetchSummaryGame: jest.fn(),
    }));
    Object.defineProperty(performance, "getEntriesByType", {
      configurable: true,
      value: () => [],
    });
    const raw = season();
    const response = {
      url: "https://dcep93.github.io/nflquery/data_v6/2007.json",
      ok: true,
      json: async () => raw,
      clone: () => response,
    };
    const cache = {
      match: jest.fn(async () => (cached ? response : undefined)),
      put: jest.fn(async () => {}),
    };
    Object.defineProperty(global, "caches", {
      configurable: true,
      value: { open: async () => cache },
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: jest.fn(async () => response),
    });
    const Data = (await import("./Data")).default;
    const result = await Data();
    expect(
      result[0].games.find((g) => g.gameId === 271202028)?.drives[6].scores,
    ).toEqual([2, 9]);
    expect(
      raw.games.find((g) => g.gameId === 271202028)?.drives[6].scores,
    ).toEqual([14, 16]);
    expect(fetch).toHaveBeenCalledTimes(cached ? 0 : 1);
  },
);
