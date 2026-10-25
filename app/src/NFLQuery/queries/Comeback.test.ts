import { DriveType, GameType } from "../types";
import QueryHelpers from "../QueryBuilder/QueryHelpers";
import { evalFunctions, QueryFunctions } from "../QueryBuilder";
import getPoints from "../QueryBuilder/getPoints";
import query from "./Comeback";

const drive = (
  team: string,
  scores: [number, number],
  clock: string
): DriveType => ({
  team,
  scores,
  description: "",
  result: "",
  plays: [{ clock, type: "", text: "", down: "", distance: 0, startYardsToEndzone: 0 }],
});

const game = (drives: DriveType[], scores: [number, number]): GameType => ({
  gameId: 1,
  week: 1,
  timestamp: 0,
  teams: ["NE", "ATL"].map((name) => ({ name, statistics: {}, boxScore: [] })),
  drives,
  scores,
});

const points = (g: GameType, functions = query.queryFunctions()) =>
  getPoints(functions, [{ year: 2016, games: [g] }]);

beforeEach(() => {
  window.QueryHelpers = QueryHelpers;
});

test("starts at 28-3, before the comeback team's next scoring drive", () => {
  const g = game([
    drive("NE", [3, 21], "Q2 0:02"),
    drive("ATL", [3, 28], "Q3 8:31"),
    drive("NE", [9, 28], "Q3 2:06"),
  ], [34, 28]);
  expect(points(g)[0]).toMatchObject({
    x: "Q3 8:31 (3,28) -> (34,28)",
    y: 25,
  });

  // Customize serializes and evaluates these functions outside their module.
  const restored = evalFunctions(Object.fromEntries(
    Object.entries(query.queryFunctions()).map(([key, fn]) => [key, fn.toString()])
  )) as QueryFunctions<any>;
  expect(points(g, restored)).toEqual(points(g));
});

test("uses the eventual loser's last possession at the score, including scoreless drives", () => {
  const g = game([
    drive("ATL", [0, 7], "Q4 10:00"),
    drive("NE", [0, 7], "Q4 8:00"),
    drive("ATL", [0, 7], "Q4 6:00"),
    drive("NE", [0, 7], "Q4 4:00"),
    drive("NE", [8, 7], "Q4 1:00"),
  ], [8, 7]);
  expect(points(g)).toEqual([{
    x: "Q4 6:00 (0,7) -> (8,7)", y: 7, label: "NE @ ATL 2016w1:1",
  }]);
});

test("uses the score before a defensive touchdown on the eventual loser's possession", () => {
  const g = game([
    drive("ATL", [0, 14], "Q4 10:00"),
    drive("NE", [0, 14], "Q4 8:00"),
    drive("ATL", [7, 14], "Q4 6:00"),
    drive("NE", [15, 14], "Q4 1:00"),
  ], [15, 14]);
  expect(points(g)).toEqual([{
    x: "Q4 6:00 (0,14) -> (15,14)", y: 14, label: "NE @ ATL 2016w1:1",
  }]);
});

test("handles a home comeback and excludes final ties", () => {
  const g = game([
    drive("NE", [7, 0], "Q4 10:00"),
    drive("ATL", [7, 0], "Q4 8:00"),
    drive("NE", [7, 0], "Q4 6:00"),
    drive("ATL", [7, 8], "Q4 1:00"),
  ], [7, 8]);
  expect(points(g)).toEqual([{
    x: "Q4 6:00 (7,0) -> (7,8)", y: 7, label: "ATL vs NE 2016w1:1",
  }]);
  expect(points({ ...g, scores: [7, 7] })).toEqual([]);
});

test("moves the Oakland 42-34 start to Cleveland's subsequent punt", () => {
  const g = game([
    drive("NE", [41, 34], "Q4 4:20"),
    drive("ATL", [42, 34], "Q4 1:51"),
    drive("NE", [42, 34], "Q4 1:38"),
    drive("ATL", [42, 42], "Q4 0:30"),
  ], [42, 45]);
  expect(points(g)[0]).toMatchObject({
    x: "Q4 1:38 (42,34) -> (42,45)", y: 8,
  });
});

test("counts distinct slower games with at least the deficit, excluding tied clocks", () => {
  const comeback = (gameId: number, deficit: number, clocks: string[]) => ({
    ...game([
      ...clocks.map((clock) => drive("ATL", [0, deficit], clock)),
      drive("NE", [deficit + 1, deficit], "Q4 0:00"),
    ], [deficit + 1, deficit]),
    gameId,
  });
  const data = [{ year: 2026, games: [
    comeback(1, 20, ["Q4 5:00"]),
    comeback(2, 18, ["Q4 8:00"]),
    comeback(3, 14, ["Q4 4:00", "Q4 1:00"]),
    comeback(4, 14, ["Q4 3:00", "Q4 2:00"]),
    comeback(5, 14, ["Q4 2:30", "Q4 1:00"]),
    comeback(6, 7, ["Q4 0:20"]),
  ] }];
  const result = getPoints(query.queryFunctions(), data);
  expect(result.map((point) => point.y)).toEqual([20, 14, 7]);
  const fourteen = result[1];
  expect(fourteen.x).toBe("Q4 1:00 (0,14) -> (15,14) (3 more but slower)");
  expect(fourteen.slowerComebacks).toEqual([
    { x: "Q4 2:00 (0,14) -> (15,14)", y: 14, label: "NE @ ATL 2026w1:4" },
    { x: "Q4 5:00 (0,20) -> (21,20)", y: 20, label: "NE @ ATL 2026w1:1" },
    { x: "Q4 8:00 (0,18) -> (19,18)", y: 18, label: "NE @ ATL 2026w1:2" },
  ]);
  expect(result[0].slowerComebacks).toBeUndefined();
  expect(result[2].slowerComebacks).toHaveLength(5);
  const restored = evalFunctions(Object.fromEntries(
    Object.entries(query.queryFunctions()).map(([key, fn]) => [key, fn.toString()])
  )) as QueryFunctions<any>;
  expect(getPoints(restored, data)).toEqual(result);
});

test("keeps only the larger deficit when record clocks match", () => {
  const games = [7, 14].map((deficit) => ({
    ...game([drive("ATL", [0, deficit], "Q4 1:00")], [deficit + 1, deficit]),
    gameId: deficit,
  }));
  const result = getPoints(query.queryFunctions(), [{ year: 2026, games }]);
  expect(result.map((point) => point.y)).toEqual([14]);
  expect(result[0].slowerComebacks).toBeUndefined();
  expect(getPoints(query.queryFunctions(), [])).toEqual([]);
});
