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

test("scoreless possessions do not restart the clock", () => {
  const g = game([
    drive("ATL", [0, 7], "Q4 10:00"),
    drive("NE", [0, 7], "Q4 8:00"),
    drive("ATL", [0, 7], "Q4 6:00"),
    drive("NE", [8, 7], "Q4 1:00"),
  ], [8, 7]);
  expect(points(g)).toEqual([{
    x: "Q4 10:00 (0,7) -> (8,7)", y: 7, label: "NE @ ATL 2016w1:1",
  }]);
});

test("handles defensive scoring on the eventual winner's possession", () => {
  const g = game([
    drive("NE", [0, 7], "Q4 10:00"),
    drive("NE", [8, 7], "Q4 1:00"),
  ], [8, 7]);
  expect(points(g)[0].x).toBe("Q4 10:00 (0,7) -> (8,7)");
});

test("handles a home comeback and excludes final ties", () => {
  const g = game([
    drive("NE", [7, 0], "Q4 10:00"),
    drive("ATL", [7, 8], "Q4 1:00"),
  ], [7, 8]);
  expect(points(g)).toEqual([{
    x: "Q4 10:00 (7,0) -> (7,8)", y: 7, label: "ATL vs NE 2016w1:1",
  }]);
  expect(points({ ...g, scores: [7, 7] })).toEqual([]);
});
