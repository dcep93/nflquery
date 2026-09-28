import { DataType, GameType } from "../Data";
import QueryHelpers from "../QueryBuilder/QueryHelpers";
import { evalFunctions, QueryFunctions } from "../QueryBuilder";
import rawGetPoints from "../QueryBuilder/getPoints";
import query from "./Week3InjuryYears";

const original = { ...QueryHelpers };
// Keep season regressions focused on their original x/y/label output.
const getPoints: typeof rawGetPoints = (functions, data) =>
  rawGetPoints(functions, data).filter((point) => point.x !== "");
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

test("counts Week 3 exit and bye weeks, stops at return and ignores later absence", () => {
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
  ).toBe(5.748);
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
  ).toBe(7.773);
});

test("no season appearance uses the ADP team without adding output metadata", () => {
  expect(score([game(3, []), game(4, []), game(5, [])])).toEqual({
    x: 2024,
    y: 5.748,
    label: "Test Player (ADP 10, 3 weeks) = 5.748",
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
  ).toBe(2.41);
});

test("name suffix/punctuation and franchise aliases match", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("A.J. Brown Jr.", 10, "STL")];
  expect(
    score([game(3, [], "LAR"), game(4, [], "LA"), game(5, ["AJ Brown"], "LAR")])
      .y,
  ).toBe(4.287);
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
  ).toBe(5.748);
});

test("current static weeks preserve Weeks 1–3, deduplicate and exclude invalid/postseason", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Current Player": [-1, 0, 1, 1, 2, 3, 4, 4, 5, 18, 19, 2.5, NaN, Infinity],
  };
  expect(
    getPoints(query.queryFunctions(), []).find((p) => p.x === 2026),
  ).toEqual({
    x: 2026,
    y: 8.463,
    label: "Current Player (ADP 10, 6 weeks) = 8.463",
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
      y: 6.886,
      label: "Current Player (ADP 10, 4 weeks) = 6.886",
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
  expect(values).toEqual([2.48, 2.41, 2.342]);
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
  expect(source.mapPoints).toContain("const durationScaleWeeks = 4");
  expect(source.mapPoints).toContain("Math.exp(-weeks.length / durationScaleWeeks)");
  expect(source.mapPoints).toContain("firstReturnAfter3");
  expect(source.mapPoints).toContain("!seen.some((a) => a.week === week)");
  expect(source.extract).toContain("Offensive/kicking appearances");
  const restored = evalFunctions(source) as QueryFunctions<any>;
  const data = historical([game(3, ["Test Player"]), game(4, [])]);
  expect(rawGetPoints(restored, data)).toEqual(rawGetPoints(functions, data));
});

test("the formula header sorts first and survives JSON while seasons retain only x/y/label", () => {
  const output = rawGetPoints(
    query.queryFunctions(),
    historical(Array.from({ length: 10 }, (_, i) => game(i + 1, []))),
  );
  expect(output[0]).toEqual({
    x: "",
    y: Number.MAX_VALUE,
    label: "",
    formula:
      "Sum of 10 * exp((10 - ADP) / 35) * (1 - exp(-numWeeks / 4)) / (1 - exp(-10 / 4)); include only exp(-(ADP - 1) / 35) >= 0.1. numWeeks includes byes.",
  });
  expect(Number.isFinite(output[0].y)).toBe(true);
  expect(JSON.parse(JSON.stringify(output))).toEqual(output);
  expect(output.slice(1).map((point) => point.x)).toEqual([2024, 2026]);
  output.slice(1).forEach((point) => {
    expect(Object.keys(point).sort()).toEqual(["label", "x", "y"]);
    expect(point.y).toBeLessThan(output[0].y);
  });
});

test("the formula header reflects customized scoring constants", () => {
  const source = Object.fromEntries(
    Object.entries(query.queryFunctions()).map(([key, fn]) => [key, fn.toString()]),
  );
  source.mapPoints = source.mapPoints
    .replace("const decayPicks = 35", "const decayPicks = 40")
    .replace("const durationScaleWeeks = 4", "const durationScaleWeeks = 5")
    .replace("const minDraftWeight = 0.1", "const minDraftWeight = 0.2");
  const customized = evalFunctions(source) as QueryFunctions<any>;
  expect(rawGetPoints(customized, [])[0]).toHaveProperty(
    "formula",
    "Sum of 10 * exp((10 - ADP) / 40) * (1 - exp(-numWeeks / 5)) / (1 - exp(-10 / 5)); include only exp(-(ADP - 1) / 40) >= 0.2. numWeeks includes byes.",
  );
});

test("early missed weeks still count after a return before Week 3", () => {
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
    y: 2.41,
    label: "Test Player (ADP 10, 1 week) = 2.410",
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
    y: 7.773,
    label: "Test Player (ADP 10, 5 weeks) = 7.773",
  });
});

test("ADP 10 missing 10 weeks scores exactly 10", () => {
  const games = Array.from({ length: 10 }, (_, i) => game(i + 1, []));
  expect(score(games)).toEqual({
    x: 2024,
    y: 10,
    label: "Test Player (ADP 10, 10 weeks) = 10.000",
  });
});

test("duration grows with diminishing returns for historical and current absences", () => {
  const values = Array.from({ length: 19 }, (_, duration) => {
    const weeks = Array.from({ length: duration }, (_, i) => i + 1);
    window.QueryHelpers.CURRENT_INJURY_WEEKS = { "Current Player": weeks };
    const current = getPoints(query.queryFunctions(), []).find(
      (p) => p.x === 2026,
    )!;
    const past = score(
      duration
        ? weeks.map((week) => game(week, []))
        : [game(1, ["Test Player"])],
    );
    expect(past.y).toBe(current.y);
    if (duration) {
      const label = `${duration} ${duration === 1 ? "week" : "weeks"}`;
      expect(past.label).toContain(label);
      expect(current.label).toContain(label);
    } else {
      expect(past.label).toBe("");
      expect(current.label).toBe("");
    }
    return current.y;
  });
  expect(values[0]).toBe(0);
  expect(values[10]).toBe(10);
  expect(values[4] / values[2]).toBeGreaterThan(1.5);
  expect(values[4] / values[2]).toBeLessThan(2);
  expect(values[14] / values[12]).toBeCloseTo(1.02, 2);
  const increments = values.slice(1).map((value, i) => value - values[i]);
  increments.forEach((increment, i) => {
    expect(increment).toBeGreaterThan(0);
    if (i) expect(increment).toBeLessThan(increments[i - 1]);
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
    y: 0.893,
    label: "Above Cutoff (ADP 81.5, 4 weeks) = 0.893",
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
    y: 4.287,
    label: "Steve Smith (ADP 10, 2 weeks) = 4.287",
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
    y: 4.287,
    label: "Test Player (ADP 10, 2 weeks) = 4.287",
  });
});

test("season output has only x/y/label and sorts formatted contributors by contribution", () => {
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
      y: 7.134,
      label:
        "More Burden (ADP 6.6, 2 weeks) = 4.724; Less Burden (ADP 10, 1 week) = 2.410",
    },
  ]);
});

test("Puka Nacua's 2024 absence is six weeks including the Week 6 bye", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("Puka Nacua", 10, "LAR")];
  expect(
    score(
      [1, 2, 3, 4, 5, 7, 8, 9].map((week) =>
        game(week, [1, 8, 9].includes(week) ? ["Puka Nacua"] : [], "LAR"),
      ),
    ),
  ).toEqual({
    x: 2024,
    y: 8.463,
    label: "Puka Nacua (ADP 10, 6 weeks) = 8.463",
  });
});

test("a healthy player has no injury weeks from an ordinary Week 4 bye", () => {
  expect(
    score([1, 2, 3, 5, 6].map((week) => game(week, ["Test Player"]))).y,
  ).toBe(0);
});

test("a Week 4 bye starts the continuous absence established by a missed Week 5", () => {
  expect(
    score([game(3, ["Test Player"]), game(5, []), game(6, ["Test Player"])]).y,
  ).toBe(4.287);
});

test("an injury bye immediately before returning still counts as a missed week", () => {
  expect(
    score([game(3, ["Test Player"]), game(4, []), game(6, ["Test Player"])]).y,
  ).toBe(4.287);
});

test("an early injury bye counts until an early return without adding later injury weeks", () => {
  expect(
    score([
      game(1, []),
      game(3, ["Test Player"]),
      game(4, ["Test Player"]),
      game(5, []),
    ]).y,
  ).toBe(4.287);
});

test("a trade return during the old team's bye ends an absence before that week", () => {
  expect(
    score([
      game(3, ["Test Player"]),
      game(4, []),
      game(5, []),
      game(7, []),
      game(6, ["Test Player"], "NYJ"),
    ]).y,
  ).toBe(4.287);
});

test("partial historical data does not invent leading or trailing injury weeks", () => {
  expect(score([game(6, []), game(8, [])])).toEqual({
    x: 2024,
    y: 5.748,
    label: "Test Player (ADP 10, 3 weeks) = 5.748",
  });
});

test.each([
  ["interior", [4, 5, 7], 6, 8, 4],
  ["trailing before return", [4, 5], 6, 7, 3],
  ["leading", [5, 6], 4, 7, 3],
  ["season-ending", [4, 5, 7], 6, null, 4],
  ["healthy", [], 6, 7, 0],
  ["after return", [4, 5], 6, 6, 2],
  ["unrelated", [1], 6, 7, 1],
] as [string, number[], number, number | null, number][])(
  "current %s bye uses existing injury and return metadata with normalized names",
  (_description, weeks, byeWeek, estimatedReturnWeek, expected) => {
    window.QueryHelpers.CURRENT_INJURY_WEEKS = { "Current Player Jr.": weeks };
    window.QueryHelpers.CURRENT_INJURY_SOURCES = {
      ...original.CURRENT_INJURY_SOURCES,
      players: {
        ...original.CURRENT_INJURY_SOURCES.players,
        "Current Player": {
          ...original.CURRENT_INJURY_SOURCES.players["Justin Jefferson"],
          byeWeek,
          estimatedReturnWeek,
        },
      },
    } as typeof original.CURRENT_INJURY_SOURCES;
    const output = getPoints(query.queryFunctions(), []).find(
      (p) => p.x === 2026,
    )!;
    expect(output.y).toBe([0, 2.41, 4.287, 5.748, 6.886][expected]);
    if (expected > 0)
      expect(output.label).toContain(
        `${expected} ${expected === 1 ? "week" : "weeks"}`,
      );
    expect(
      window.QueryHelpers.CURRENT_INJURY_WEEKS["Current Player Jr."],
    ).toEqual(weeks);
  },
);
