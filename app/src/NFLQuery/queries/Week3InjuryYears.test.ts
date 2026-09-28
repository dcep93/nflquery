import { DataType, GameType } from "../Data";
import QueryHelpers from "../QueryBuilder/QueryHelpers";
import { evalFunctions, QueryFunctions } from "../QueryBuilder";
import getPoints from "../QueryBuilder/getPoints";
import query from "./Week3InjuryYears";

const original = { ...QueryHelpers };
const game = (week: number, names: string[], team = "SF"): GameType => ({
  gameId: 1000 + week,
  week,
  timestamp: week,
  teams: [
    {
      name: team,
      statistics: {},
      boxScore: [
        {
          category: "receiving",
          labels: ["REC", "YDS", "TD"],
          players: names.map((name) => ({ name, stats: ["0", "0", "0"] })),
        },
      ],
    },
  ],
  drives: [],
  scores: [0, 0],
});
const player = (name = "Test Player", adp = 1, team: string | null = "SF") => ({
  name,
  adp,
  team,
  position: "WR",
  bye: null,
});
const historical = (games: GameType[], year = 2024): DataType[] => [
  { year, games },
];
const score = (games: GameType[]) =>
  getPoints(query.queryFunctions(), historical(games)).find(
    (p) => p.x === 2024,
  )!;

beforeEach(() => {
  window.QueryHelpers = {
    ...original,
    ADP_BY_YEAR: { 2024: [player()], 2026: [player("Current Player")] },
    CURRENT_INJURY_WEEKS: { "Current Player": [4, 5] },
  };
});
afterEach(() => {
  window.QueryHelpers = original;
});

test("counts Week 3 exit, skips bye, stops at return and ignores later absence", () => {
  expect(
    score([
      game(1, ["Test Player"]),
      game(2, ["Test Player"]),
      game(3, ["Test Player"]),
      game(4, []),
      game(6, []),
      game(7, ["Test Player"]),
      game(8, []),
      game(-1, []),
    ]).y,
  ).toBe(2);
});

test("zero-point box score is an appearance and ends an absence", () => {
  expect(score([game(3, []), game(4, ["Test Player"]), game(5, [])]).y).toBe(0);
});

test("later injury contributes nothing when the player appeared after Week 3", () => {
  expect(
    score([
      game(3, ["Test Player"]),
      game(4, ["Test Player"]),
      game(5, []),
      game(6, []),
    ]).y,
  ).toBe(0);
});

test("opening absence does not require a Week 1 appearance", () => {
  expect(
    score([
      game(1, []),
      game(2, []),
      game(3, []),
      game(4, []),
      game(5, []),
      game(6, ["Test Player"]),
    ]).y,
  ).toBe(2);
});

test("no season appearance uses the ADP team and exposes unknown cause", () => {
  const result = score([game(3, []), game(4, []), game(5, [])]);
  expect(result.y).toBe(2);
  expect(result).toMatchObject({
    players: [{ basis: "no season appearance; cause unknown" }],
  });
});

test("observed team overrides stale ADP team; trade return ends stretch during old-team bye", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Test Player", 1, "NYJ")];
  expect(
    score([
      game(3, ["Test Player"]),
      game(4, []),
      game(6, []),
      game(5, ["Test Player"], "NYJ"),
    ]).y,
  ).toBe(1);
});

test("name suffix/punctuation and franchise aliases match", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("A.J. Brown Jr.", 1, "STL")];
  expect(
    score([game(3, [], "LAR"), game(4, [], "LA"), game(5, ["AJ Brown"], "LAR")])
      .y,
  ).toBe(1);
});

test("FFC nicknames match NFLQuery names instead of inventing season-long gaps", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Will Fuller")];
  expect(
    score([game(3, ["William Fuller V"]), game(4, ["William Fuller V"])]).y,
  ).toBe(0);
});

test("a defensive namesake cannot end the sole ADP player's injury stretch", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Michael Thomas", 1, "NO")];
  const defense = game(4, ["Michael Thomas"], "HOU");
  defense.teams[0].boxScore[0].category = "defensive";
  expect(
    score([
      game(1, ["Michael Thomas"], "NO"),
      game(3, [], "NO"),
      game(4, [], "NO"),
      game(5, [], "NO"),
      game(6, ["Michael Thomas"], "NO"),
      defense,
    ]).y,
  ).toBe(2);
});

test("current estimate uses static weeks, deduplicates and excludes Week 3/postseason", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Current Player": [3, 4, 4, 5, 19],
  };
  const output = getPoints(query.queryFunctions(), []);
  expect(output.find((p) => p.x === 2026)?.y).toBe(2);
});

test("unmatched ADP is disclosed, not silently fabricated", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = { Unknown: [4] };
  expect(getPoints(query.queryFunctions(), [])[0]).toMatchObject({
    y: 0,
    unscored: ["Unknown: absent from ADP source; unscored"],
  });
});

test("smooth weighting does not have round cliffs", () => {
  const values = [9, 10, 11].map((adp) => {
    window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Test Player", adp)];
    return score([game(3, ["Test Player"]), game(4, [])]).y;
  });
  expect(values).toEqual([0.796, 0.773, 0.751]);
});

test("full functions survive the Customize serialization with no hidden scorer", () => {
  const functions = query.queryFunctions();
  const source = Object.fromEntries(
    Object.entries(functions).map(([k, fn]) => [k, fn.toString()]),
  );
  expect(source.mapPoints).toContain("Math.exp");
  const restored = evalFunctions(source) as QueryFunctions<any>;
  const data = historical([game(3, ["Test Player"]), game(4, [])]);
  expect(getPoints(restored, data)).toEqual(getPoints(functions, data));
});
