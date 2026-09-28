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
  ).toBe(4.1);
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
  ).toBe(6.225);
});

test("no season appearance uses the ADP team without adding output metadata", () => {
  expect(score([game(3, []), game(4, []), game(5, [])])).toEqual({
    x: 2024,
    y: 4.1,
    label: "Test Player (ADP 10, 3 weeks) = 4.100",
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
  ).toBe(1.505);
});

test("name suffix/punctuation and franchise aliases match", () => {
  window.QueryHelpers.ADP_BY_YEAR[2024] = [player("A.J. Brown Jr.", 10, "STL")];
  expect(
    score([game(3, [], "LAR"), game(4, [], "LA"), game(5, ["AJ Brown"], "LAR")])
      .y,
  ).toBe(2.868);
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
  ).toBe(4.1);
});

test("current static weeks preserve Weeks 1–3, deduplicate and exclude invalid/postseason", () => {
  window.QueryHelpers.CURRENT_INJURY_WEEKS = {
    "Current Player": [-1, 0, 1, 1, 2, 3, 4, 4, 5, 18, 19, 2.5, NaN, Infinity],
  };
  expect(
    getPoints(query.queryFunctions(), []).find((p) => p.x === 2026),
  ).toEqual({
    x: 2026,
    y: 7.138,
    label: "Current Player (ADP 10, 6 weeks) = 7.138",
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
      y: 5.215,
      label: "Current Player (ADP 10, 4 weeks) = 5.215",
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
  expect(values).toEqual([1.603, 1.505, 1.414]);
});

test("full functions survive the Customize serialization with no hidden scorer", () => {
  const functions = query.queryFunctions();
  const source = Object.fromEntries(
    Object.entries(functions).map(([k, fn]) => [k, fn.toString()]),
  );
  expect(source.mapPoints).toContain("Math.exp");
  expect(source.mapPoints).toContain("const minDraftWeight = 0.1");
  expect(source.mapPoints).toContain("draftWeight < minDraftWeight");
  expect(source.mapPoints).toContain("draftValue / referenceDraftValue");
  expect(source.mapPoints).toContain("injuryCost / referenceInjuryCost");
  expect(source.mapPoints).toContain("const cutoffDecay = 35");
  expect(source.mapPoints).toContain("const adpDecay = 16");
  expect(source.mapPoints).toContain("const durationScale = 10");
  expect(source.mapPoints).toContain("Math.exp(-weeks.length / durationScale)");
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
      "sum(10 × draftValue(ADP) / draftValue(10) × injuryCost(weeks) / injuryCost(10))",
    draftValue: "exp(-ADP / adpDecay)",
    injuryCost: "1 - exp(-weeks / durationScale)",
    parameters: { adpDecay: 16, durationScale: 10 },
  });
  expect(Number.isFinite(output[0].y)).toBe(true);
  expect(JSON.parse(JSON.stringify(output))).toEqual(output);
  expect(output.slice(1).map((point) => point.x)).toEqual([2024, 2026]);
  output.slice(1).forEach((point) => {
    expect(Object.keys(point).sort()).toEqual(["label", "x", "y"]);
    expect(point.y).toBeLessThan(output[0].y);
  });
});

test("the formula header reflects customized scoring constants while the reference stays exactly 10", () => {
  const source = Object.fromEntries(
    Object.entries(query.queryFunctions()).map(([key, fn]) => [
      key,
      fn.toString(),
    ]),
  );
  source.mapPoints = source.mapPoints
    .replace("const adpDecay = 16", "const adpDecay = 24")
    .replace("const durationScale = 10", "const durationScale = 6");
  const customized = evalFunctions(source) as QueryFunctions<any>;
  const output = rawGetPoints(
    customized,
    historical(Array.from({ length: 10 }, (_, i) => game(i + 1, []))),
  );
  expect(output[0]).toEqual({
    ...rawGetPoints(query.queryFunctions(), [])[0],
    parameters: { adpDecay: 24, durationScale: 6 },
  });
  expect(output.find((point) => point.x === 2024)).toEqual({
    x: 2024,
    y: 10,
    label: "Test Player (ADP 10, 10 weeks) = 10.000",
  });
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
    y: 1.505,
    label: "Test Player (ADP 10, 1 week) = 1.505",
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
    y: 6.225,
    label: "Test Player (ADP 10, 5 weeks) = 6.225",
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

test.each([
  ["Christian McCaffrey", 2.7, 9, 14.816],
  ["Tua Tagovailoa", 16.4, 5, 4.172],
] as [string, number, number, number][])(
  "%s retains the approved ADP and duration calibration",
  (name, adp, weeks, expected) => {
    window.QueryHelpers.ADP_BY_YEAR[2024] = [player(name, adp)];
    expect(
      score(Array.from({ length: weeks }, (_, i) => game(i + 1, []))).y,
    ).toBe(expected);
  },
);

test("Peterson's early draft value and longer absence outweigh Moncrief by about 67.9 times", () => {
  const players: [string, number, number][] = [
    ["Adrian Peterson", 8.8, 12],
    ["Donte Moncrief", 67.1, 5],
  ];
  const contributions = players.map(([name, adp, weeks]) => {
    window.QueryHelpers.ADP_BY_YEAR[2024] = [player(name, adp)];
    return score(Array.from({ length: weeks }, (_, i) => game(i + 1, []))).y;
  });
  expect(contributions).toEqual([11.916, 0.175]);
  // Output rounds to three decimals, so its ratio has less precision.
  expect(contributions[0] / contributions[1]).toBeCloseTo(67.9, 0);
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
  expect(values[9] / values[5]).toBeCloseTo(1.508, 3);
  expect(values[14] / values[12]).toBeCloseTo(1.078, 3);
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
    y: 0.06,
    label: "Above Cutoff (ADP 81.5, 4 weeks) = 0.060",
  });
});

test.each([8, 24, 40])(
  "eligibility stays at ADP 81.5/81.6 when adpDecay changes to %s",
  (adpDecay) => {
    window.QueryHelpers.ADP_BY_YEAR[2024] = [
      player("Above Cutoff", 81.5),
      player("Below Cutoff", 81.6),
    ];
    const source = Object.fromEntries(
      Object.entries(query.queryFunctions()).map(([key, fn]) => [
        key,
        fn.toString(),
      ]),
    );
    source.mapPoints = source.mapPoints.replace(
      "const adpDecay = 16",
      `const adpDecay = ${adpDecay}`,
    );
    const customized = evalFunctions(source) as QueryFunctions<any>;
    const output = getPoints(
      customized,
      historical([game(1, []), game(2, []), game(3, []), game(4, [])]),
    ).find((point) => point.x === 2024)!;
    expect(output.label).toContain("Above Cutoff (ADP 81.5, 4 weeks)");
    expect(output.label).not.toContain("Below Cutoff");
  },
);

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
    y: 2.868,
    label: "Steve Smith (ADP 10, 2 weeks) = 2.868",
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
    y: 2.868,
    label: "Test Player (ADP 10, 2 weeks) = 2.868",
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
      y: 5.052,
      label:
        "More Burden (ADP 6.6, 2 weeks) = 3.547\nLess Burden (ADP 10, 1 week) = 1.505",
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
    y: 7.138,
    label: "Puka Nacua (ADP 10, 6 weeks) = 7.138",
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
  ).toBe(2.868);
});

test("an injury bye immediately before returning still counts as a missed week", () => {
  expect(
    score([game(3, ["Test Player"]), game(4, []), game(6, ["Test Player"])]).y,
  ).toBe(2.868);
});

test("an early injury bye counts until an early return without adding later injury weeks", () => {
  expect(
    score([
      game(1, []),
      game(3, ["Test Player"]),
      game(4, ["Test Player"]),
      game(5, []),
    ]).y,
  ).toBe(2.868);
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
  ).toBe(2.868);
});

test("partial historical data does not invent leading or trailing injury weeks", () => {
  expect(score([game(6, []), game(8, [])])).toEqual({
    x: 2024,
    y: 4.1,
    label: "Test Player (ADP 10, 3 weeks) = 4.100",
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
    expect(output.y).toBe([0, 1.505, 2.868, 4.1, 5.215][expected]);
    if (expected > 0)
      expect(output.label).toContain(
        `${expected} ${expected === 1 ? "week" : "weeks"}`,
      );
    expect(
      window.QueryHelpers.CURRENT_INJURY_WEEKS["Current Player Jr."],
    ).toEqual(weeks);
  },
);
