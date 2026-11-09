import { readFileSync } from "fs";
import { resolve } from "path";
import QueryHelpers from "../QueryBuilder/QueryHelpers";
import { evalFunctions, QueryFunctions } from "../QueryBuilder";
import getPoints from "../QueryBuilder/getPoints";
import { buildQueryOutput } from "../QueryResults";
import Comeback from "./Comeback";
import March from "./March";
import type { DataType } from "../types";

beforeEach(() => {
  window.QueryHelpers = QueryHelpers;
});

test.each([Comeback, March])(
  "Customize serialization keeps helpers available and report headers unranked",
  (query) => {
    const season: DataType = JSON.parse(
      readFileSync(resolve(__dirname, "../../../../data_v6/2008.json"), "utf8"),
    );
    const data = [
      { ...season, games: season.games.filter((g) => g.gameId === 281012001) },
    ];
    const result = getPoints(query.queryFunctions(), data);
    const restored = evalFunctions(
      Object.fromEntries(
        Object.entries(query.queryFunctions()).map(([key, fn]) => [
          key,
          fn.toString(),
        ]),
      ),
    ) as QueryFunctions<any>;
    expect(getPoints(restored, data)).toEqual(result);
    expect(result[0]).toMatchObject({ x: "", y: Number.MAX_VALUE, label: "" });
    const output = buildQueryOutput(result);
    expect(output.points[0].index).toBeUndefined();
    expect(output.num_points).toBe(1);
    expect(output.points[1].index).toBe(1);
  },
);

test("report lists dominated candidates once, preserves exact ties, and includes exclusions without ranking them", () => {
  const base = {
    gameId: 1,
    year: 2026,
    mode: "comeback" as const,
    candidates: [],
    exclusions: [],
  };
  const candidate = (value: number, remainingSeconds: number) => ({
    value,
    remainingSeconds,
    clock: `Q4 0:${remainingSeconds}`,
    description: "A 0 / B 7; final A 8 / B 7",
  });
  const points = [
    {
      ...base,
      candidates: [
        candidate(7, 10),
        candidate(7, 10),
        candidate(6, 10),
        candidate(7, 20),
      ],
    },
    { ...base, gameId: 2, exclusions: ["Invalid score chronology."] },
  ].map((extraction, i) => ({
    extraction,
    label: `Game ${i + 1}`,
    timestamp: 0,
  }));
  const output = buildQueryOutput(
    QueryHelpers.mapLateGamePoints(points, "comeback"),
  );
  expect(output.num_points).toBe(2);
  expect(output.points[0].lateGameReport).toMatchObject({
    gamesAnalyzed: 2,
    excludedGames: 1,
    dominated: [{ y: 7 }, { y: 6 }],
  });
  expect(
    QueryHelpers.mapLateGamePoints([], "comeback")[0].lateGameReport,
  ).toMatchObject({ gamesAnalyzed: 0, excludedGames: 0 });
});
