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
const player = (
  name = "Test Player",
  adp = 10,
  team: string | null = "SF",
) => ({
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
  expect(
    score([game(3, ["Test Player"]), game(4, ["Test Player"]), game(5, [])]).y,
  ).toBe(0);
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
  ).toBe(5);
});

test("no season appearance uses the ADP team without adding output metadata", () => {
  expect(score([game(3, []), game(4, []), game(5, [])])).toEqual({
    x: 2024,
    y: 3,
    label: "Test Player (ADP 10, 3 weeks) = 3.000",
  });
});

test("observed team overrides stale ADP team; trade return ends stretch during old-team bye", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Test Player", 10, "NYJ")];
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
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("A.J. Brown Jr.", 10, "STL")];
  expect(
    score([game(3, [], "LAR"), game(4, [], "LA"), game(5, ["AJ Brown"], "LAR")])
      .y,
  ).toBe(2);
});

test("FFC nicknames match NFLQuery names instead of inventing season-long gaps", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Will Fuller")];
  expect(
    score([game(3, ["William Fuller V"]), game(4, ["William Fuller V"])]).y,
  ).toBe(0);
});

test("a defensive namesake cannot end the sole ADP player's injury stretch", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Michael Thomas", 10, "NO")];
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
  ).toBe(3);
});

test("current static weeks preserve Weeks 1–3, deduplicate and exclude invalid/postseason", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Current Player": [-1, 0, 1, 1, 2, 3, 4, 4, 5, 18, 19, 2.5, NaN, Infinity],
  };
  expect(
    getPoints(query.queryFunctions(), []).find((p) => p.x === 2026),
  ).toEqual({
    x: 2026,
    y: 6,
    label: "Current Player (ADP 10, 6 weeks) = 6.000",
  });
});

test("the current static map is authoritative despite missing games or appearances", () => {
  window.QueryHelpers.ADP_BY_YEAR[2026].push(player("Unplayed Monday Player"));
  window.QueryHelpers.CURRENT_INJURY_WEEKS = { "Current Player": [1, 2, 3, 4] };
  const output = getPoints(
    query.queryFunctions(),
    historical(
      [game(1, ["Current Player"]), game(2, ["Current Player"])],
      2026,
    ),
  );
  expect(output).toEqual([
    {
      x: 2026,
      y: 4,
      label: "Current Player (ADP 10, 4 weeks) = 4.000",
    },
  ]);
});

test("unmatched ADP and missing historical team schedules are silently skipped", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = { Unknown: [4] };
  expect(getPoints(query.queryFunctions(), [])).toEqual([
    {
      x: 2026,
      y: 0,
      label: "",
    },
  ]);
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Unknown", 10, null)];
  expect(score([game(3, []), game(4, [])])).toEqual({
    x: 2024,
    y: 0,
    label: "",
  });
});

test("smooth weighting does not have round cliffs", () => {
  const values = [9, 10, 11].map((adp) => {
    window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Test Player", adp)];
    return score([game(3, ["Test Player"]), game(4, [])]).y;
  });
  expect(values).toEqual([1.029, 1, 0.972]);
});

test("full functions survive the Customize serialization with no hidden scorer", () => {
  const functions = query.queryFunctions();
  const source = Object.fromEntries(
    Object.entries(functions).map(([k, fn]) => [k, fn.toString()]),
  );
  expect(source.mapPoints).toContain("Math.exp");
  expect(source.mapPoints).toContain("const minDraftWeight = 0.1");
  expect(source.mapPoints).toContain("draftWeight < minDraftWeight");
  expect(source.mapPoints).toContain("draftWeight / referenceWeight");
  expect(source.mapPoints).toContain("firstReturnAfter3");
  expect(source.mapPoints).toContain("!seen.some((a) => a.week === week)");
  expect(source.extract).toContain("Offensive/kicking appearances");
  const restored = evalFunctions(source) as QueryFunctions<any>;
  const data = historical([game(3, ["Test Player"]), game(4, [])]);
  expect(getPoints(restored, data)).toEqual(getPoints(functions, data));
});

test("early missed games still count after a return before Week 3", () => {
  expect(
    score([
      game(1, []),
      game(2, ["Test Player"]),
      game(3, ["Test Player"]),
      game(4, ["Test Player"]),
      game(5, []),
    ]),
  ).toEqual({
    x: 2024,
    y: 1,
    label: "Test Player (ADP 10, 1 week) = 1.000",
  });
});

test("all early gaps combine with the continuous post-Week-3 absence", () => {
  expect(
    score([
      game(1, []),
      game(2, ["Test Player"]),
      game(3, []),
      game(4, []),
      game(6, []),
      game(7, ["Test Player"]),
      game(8, []),
    ]),
  ).toEqual({
    x: 2024,
    y: 4,
    label: "Test Player (ADP 10, 4 weeks) = 4.000",
  });
});

test("ADP 10 missing 10 games scores exactly 10", () => {
  const games = Array.from({ length: 10 }, (_, i) => game(i + 1, []));
  expect(score(games)).toEqual({
    x: 2024,
    y: 10,
    label: "Test Player (ADP 10, 10 weeks) = 10.000",
  });
});

test("tiny Gates and Cook draft weights are excluded even for a whole season", () => {
  const players = [player("Antonio Gates", 102.5), player("Jared Cook", 141.4)];
  window.QueryHelpers.ADP_BY_YEAR[2024] = players;
  window.QueryHelpers.ADP_BY_YEAR[2026] = players;
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Antonio Gates": weeks,
    "Jared Cook": weeks,
  };
  expect(
    getPoints(
      query.queryFunctions(),
      historical(weeks.map((w) => game(w, []))),
    ),
  ).toEqual([
    { x: 2024, y: 0, label: "" },
    { x: 2026, y: 0, label: "" },
  ]);
});

test("the 0.1 threshold applies before normalization or duration", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [
    player("Above Cutoff", 81.5),
    player("Below Cutoff", 81.6),
  ];
  expect(score([game(1, []), game(2, []), game(3, []), game(4, [])])).toEqual({
    x: 2024,
    y: 0.519,
    label: "Above Cutoff (ADP 81.5, 4 weeks) = 0.519",
  });
});

test("same-name offensive players are separated by ADP team", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [
    player("Steve Smith", 10, "CAR"),
    player("Steve Smith", 10, "NYG"),
  ];
  expect(
    score([
      game(3, ["Steve Smith"], "CAR"),
      game(4, [], "CAR"),
      game(5, [], "CAR"),
      game(6, ["Steve Smith"], "CAR"),
      game(3, ["Steve Smith"], "NYG"),
      game(4, ["Steve Smith"], "NYG"),
    ]),
  ).toEqual({
    x: 2024,
    y: 2,
    label: "Steve Smith (ADP 10, 2 weeks) = 2.000",
  });
});

test("historical schedules deduplicate games and exclude invalid/postseason weeks", () => {
  expect(
    score([
      game(1, []),
      game(1, []),
      game(2, ["Test Player"]),
      game(3, ["Test Player"]),
      game(4, []),
      game(-1, []),
      game(0, []),
      game(19, []),
      game(2.5, []),
    ]),
  ).toEqual({
    x: 2024,
    y: 2,
    label: "Test Player (ADP 10, 2 weeks) = 2.000",
  });
});

test("output has only x/y/label and sorts formatted contributors by contribution", () => {
  window.QueryHelpers.ADP_BY_YEAR[2026] = [
    player("Less Burden", 10),
    player("More Burden", 6.6),
  ];
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Less Burden": [1],
    "More Burden": [1, 2],
  };
  expect(getPoints(query.queryFunctions(), [])).toEqual([
    {
      x: 2026,
      y: 3.204,
      label:
        "More Burden (ADP 6.6, 2 weeks) = 2.204; Less Burden (ADP 10, 1 week) = 1.000",
    },
  ]);
});
