import { readFileSync } from "fs";
import { resolve } from "path";
import { analyzeLateGame, paretoFrontier } from "./lateGameAnalysis";
import { correctGameData } from "./dataCorrections";
import type { DriveType, GameType, PlayType } from "./types";

const play = (
  type: string,
  clock: string,
  start = 75,
  distance = 0,
): PlayType => ({
  type,
  clock,
  startYardsToEndzone: start,
  distance,
  text: type,
  down: "1 & 10",
});
const drive = (
  team: string,
  scores: [number, number],
  plays: PlayType[],
  result = "",
): DriveType => ({ team, scores, plays, result, description: "" });
const game = (
  drives: DriveType[],
  scores: [number, number] = drives[drives.length - 1].scores,
): GameType => ({
  gameId: 1,
  week: 1,
  timestamp: 0,
  teams: ["A", "B"].map((name) => ({ name, statistics: {}, boxScore: [] })),
  drives,
  scores,
});
const analyze = (g: GameType, mode: "march" | "comeback") =>
  analyzeLateGame(g, g.scores[0] > g.scores[1] ? 0 : 1, mode, 2026)[0];
const fixture = (year: number, gameId: number): GameType =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../data_v6/${year}.json`), "utf8"),
  ).games.find((g: GameType) => g.gameId === gameId);

test("Atlanta real final possession measures 26 net yards at six seconds despite holder position and unrelated bad clocks", () => {
  const result = analyze(fixture(2008, 281012001), "march");
  expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0]).toMatchObject({
    value: 26,
    clock: "Q4 0:06",
    remainingSeconds: 6,
    startYardsToEndzone: 56,
  });
  expect(result.candidates[0].description).toContain("own 44");
  expect(result.candidates[0].description).toContain("CHI 20 / ATL 22");
  expect(result.exclusions).toEqual([]);
});

test("Buffalo correction is narrow, immutable, idempotent and gives the evidenced 11-point deficit", () => {
  const raw = fixture(2007, 271202028);
  const original = JSON.stringify(raw);
  const fixed = correctGameData(raw);
  expect(fixed.drives[6].scores).toEqual([2, 9]);
  expect(fixed.drives[6].plays.slice(-1)[0].clock).toBe("Q2 0:25");
  expect(fixed.drives[13].plays.slice(-1)[0].clock).toBe("Q3 0:26");
  expect(JSON.stringify(raw)).toBe(original);
  expect(correctGameData(fixed)).toBe(fixed);
  expect(correctGameData({ ...raw, gameId: 2 })).toMatchObject({
    drives: raw.drives,
  });
  const result = analyze(raw, "comeback");
  expect(result.candidates.find((c) => c.value === 11)).toMatchObject({
    clock: "Q3 5:42",
    remainingSeconds: 1242,
  });
  expect(
    result.candidates.some((c) => c.clock === "Q4 0:26" || c.value === 8),
  ).toBe(false);
  expect(result.exclusions).toEqual([]);
});

test("Comeback uses opponent scoring and post-score conversion, not scoreless drives or its own scoring", () => {
  const g = game([
    drive(
      "B",
      [0, 7],
      [play("RUSH", "Q4 10:05", 5, 5), play("XP", "Q4 10:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [3, 7],
      [play("FG", "Q4 8:05"), play("K", "Q4 8:00")],
      "Field Goal",
    ),
    drive("B", [3, 7], [play("PUNT", "Q4 6:00")], "Punt"),
    drive(
      "A",
      [10, 7],
      [play("PASS", "Q4 1:05", 20, 20), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 7, clock: "Q4 10:00" },
  ]);
});

test("FG pre-snap clock is never used; next-drive leading kickoff is evidence", () => {
  const scoring = drive("B", [0, 3], [play("FG", "Q4 1:05")], "Field Goal");
  const winner = drive(
    "A",
    [7, 3],
    [
      play("K", "Q4 1:01"),
      play("PASS", "Q4 0:05", 10, 10),
      play("XP", "Q4 0:00"),
    ],
    "Touchdown",
  );
  expect(analyze(game([scoring, winner]), "comeback").candidates).toMatchObject(
    [{ clock: "Q4 1:01" }],
  );
  const missing = analyze(
    game([scoring, { ...winner, plays: winner.plays.slice(1) }]),
    "comeback",
  );
  expect(missing.candidates).toEqual([]);
  expect(missing.exclusions.join(" ")).toMatch(/post-score/i);
});

test("opponent defensive scoring counts; winner defensive scoring does not establish a deficit or March", () => {
  const g = game([
    drive(
      "A",
      [0, 7],
      [play("INT", "Q4 5:05"), play("XP", "Q4 5:00")],
      "Touchdown",
    ),
    drive(
      "B",
      [8, 7],
      [play("INT", "Q4 1:05"), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 7, clock: "Q4 5:00" },
  ]);
  expect(analyze(g, "march").candidates).toEqual([]);
});

test("March counts enforced penalties, excludes kickoff/period/timeout and measures pre-FG endpoint", () => {
  const g = game([
    drive(
      "A",
      [3, 0],
      [
        play("K", "Q3 0:02", 70),
        play("PEN", "Q3 0:01", 80, -5),
        play("EP", "Q3 0:00", 0),
        play("PASS", "Q4 15:00", 85, 50),
        play("TO", "Q4 14:00", 0),
        play("FG", "Q4 14:00", 43),
      ],
      "Field Goal",
    ),
  ]);
  expect(analyze(g, "march").candidates).toMatchObject([
    { value: 45, startYardsToEndzone: 80, clock: "Q3 0:01" },
  ]);
});

test("March selects permanent go-ahead possession from tied start, not later insurance", () => {
  const g = game([
    drive(
      "A",
      [7, 0],
      [play("PASS", "Q4 10:05", 70, 70), play("XP", "Q4 10:00")],
      "Touchdown",
    ),
    drive(
      "B",
      [7, 7],
      [play("PASS", "Q4 5:05", 60, 60), play("XP", "Q4 5:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [14, 7],
      [play("PASS", "Q4 2:05", 80, 80), play("XP", "Q4 2:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [17, 7],
      [play("PASS", "Q4 0:10", 40, 5), play("FG", "Q4 0:01", 43)],
      "Field Goal",
    ),
  ]);
  expect(analyze(g, "march").candidates).toMatchObject([
    { value: 80, clock: "Q4 2:05" },
  ]);
});

test("zero-clock untimed down qualifies; OT March does not, regulation comeback ending in OT does", () => {
  expect(
    analyze(
      game([
        drive("A", [6, 0], [play("PASS", "Q4 0:00", 40, 40)], "Touchdown"),
      ]),
      "march",
    ).candidates[0],
  ).toMatchObject({ value: 40, remainingSeconds: 0 });
  const g = game([
    drive(
      "B",
      [0, 7],
      [play("RUSH", "Q4 1:05", 10, 10), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [7, 7],
      [play("PASS", "Q4 0:05", 30, 30), play("XP", "Q4 0:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [10, 7],
      [play("PASS", "Q5 5:00", 40, 10), play("FG", "Q5 4:00", 38)],
      "Field Goal",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 7, clock: "Q4 1:00" },
  ]);
  expect(analyze(g, "march").candidates).toEqual([]);
});

test("invalid score chronology/final agreement and relevant clocks/positions are excluded", () => {
  const valid = game([
    drive(
      "B",
      [0, 3],
      [play("FG", "Q4 2:05"), play("K", "Q4 2:00")],
      "Field Goal",
    ),
    drive(
      "A",
      [7, 3],
      [play("PASS", "Q4 1:05", 50, 50), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
  ]);
  for (const g of [
    { ...valid, scores: [8, 3] as [number, number] },
    {
      ...valid,
      drives: [
        valid.drives[0],
        { ...valid.drives[1], scores: [7, 2] as [number, number] },
      ],
    },
  ]) {
    expect(analyze(g, "comeback").candidates).toEqual([]);
    expect(analyze(g, "comeback").exclusions.join(" ")).toMatch(/score/i);
  }
  for (const clock of ["Q4 16:00", "Q4 1:70", "Q4 3:00"]) {
    const g = {
      ...valid,
      drives: [
        {
          ...valid.drives[0],
          plays: [valid.drives[0].plays[0], play("K", clock)],
        },
        valid.drives[1],
      ],
    };
    expect(analyze(g, "comeback").candidates).toEqual([]);
    expect(analyze(g, "comeback").exclusions.length).toBeGreaterThan(0);
  }
  const badPosition = {
    ...valid,
    drives: [
      valid.drives[0],
      { ...valid.drives[1], plays: [play("PASS", "Q4 1:05", 120, 120)] },
    ],
  };
  expect(analyze(badPosition, "march").exclusions.join(" ")).toMatch(
    /field position/i,
  );
});

test("frontier keeps exact ties and removes same-time smaller and earlier equal candidates", () => {
  const values = [
    { value: 20, remainingSeconds: 100 },
    { value: 20, remainingSeconds: 100 },
    { value: 19, remainingSeconds: 100 },
    { value: 20, remainingSeconds: 101 },
    { value: 10, remainingSeconds: 5 },
    { value: 30, remainingSeconds: 200 },
  ];
  expect(paretoFrontier(values)).toEqual([
    values[0],
    values[1],
    values[4],
    values[5],
  ]);
});

test("real Miami scoring summary cannot masquerade as an untimed start, and Philadelphia punt return is not a March", () => {
  const miami = analyze(fixture(2018, 401030761), "march");
  expect(miami.candidates).toEqual([]);
  expect(miami.exclusions.join(" ")).toMatch(/start clock is not evidenced/);
  expect(analyze(fixture(2010, 301219019), "march").candidates).toEqual([]);
});

test("Comeback rejects a scoring clock later than the immediately following possession", () => {
  const g = game([
    drive(
      "B",
      [0, 3],
      [play("FG", "Q4 0:25"), play("K", "Q4 0:20")],
      "Field Goal",
    ),
    drive(
      "A",
      [7, 3],
      [play("PASS", "Q4 1:05", 50, 50), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
  ]);
  const result = analyze(g, "comeback");
  expect(result.candidates).toEqual([]);
  expect(result.exclusions.join(" ")).toMatch(/Clock moves backward/);
});

test("Minnesota 2022 real 33-point deficit uses the next drive's kickoff alias at Q2 0:08", () => {
  const result = analyze(fixture(2022, 401437904), "comeback");
  expect(result.candidates.find((c) => c.value === 33)).toMatchObject({
    clock: "Q2 0:08",
    remainingSeconds: 1808,
  });
});

test("March never counts a post-field-goal penalty as its endpoint", () => {
  const g = game([
    drive(
      "A",
      [3, 0],
      [
        play("PASS", "Q4 1:00", 70, 40),
        play("FG", "Q4 0:05", 38),
        play("PEN", "Q4 0:01", 70, -15),
      ],
      "Field Goal",
    ),
  ]);
  expect(analyze(g, "march").candidates).toMatchObject([{ value: 40 }]);
});

test("Comeback recognizes defensive scoring result variants and two-point conversions", () => {
  const g = game([
    drive(
      "A",
      [0, 8],
      [play("INTR", "Q4 5:05"), play("_TwoPointPass", "Q4 5:00")],
      "Interception Touchdown",
    ),
    drive("A", [9, 8], [play("FG", "Q4 0:00")], "Field Goal"),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 8, clock: "Q4 5:00" },
  ]);
});

test("March uses explicit snap-time text instead of an end-of-play clock, including one-play touchdowns", () => {
  for (const type of ["TD", "PASS", "REC"]) {
    const scoring = {
      ...play(type, "Q4 0:00", 69, 69),
      text: "(0:07) Quarterback pass for 69 yards, TOUCHDOWN.",
    };
    const g = game([
      drive("A", [6, 0], [play("K", "Q4 0:16"), scoring], "Touchdown"),
    ]);
    expect(analyze(g, "march").candidates).toMatchObject([
      { clock: "Q4 0:07", remainingSeconds: 7, value: 69 },
    ]);
  }
});

test("post-score conversion can be a leading play of the next drive", () => {
  const g = game([
    drive("B", [0, 7], [play("RUSH", "Q4 1:05", 10, 10)], "Touchdown"),
    drive(
      "A",
      [8, 7],
      [
        play("XP", "Q4 1:00"),
        play("K", "Q4 1:00"),
        play("PASS", "Q4 0:05", 50, 50),
        play("2PTC", "Q4 0:00"),
      ],
      "Touchdown",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 7, clock: "Q4 1:00" },
  ]);
});

test("monotonic scores still need to match the scoring event's point value", () => {
  for (const [result, type, points] of [
    ["Field Goal", "FG", 9],
    ["Touchdown", "PASS", 14],
    ["Safety", "SF", 5],
  ] as const) {
    const g = game([
      drive(
        "B",
        [0, points],
        [play(type, "Q4 1:05"), play("K", "Q4 1:00")],
        result,
      ),
      drive("A", [points + 1, points], [play("PASS", "Q4 0:00")], "Touchdown"),
    ]);
    expect(analyze(g, "comeback").candidates).toEqual([]);
    expect(analyze(g, "comeback").exclusions.join(" ")).toMatch(
      /Score change.*disagrees/,
    );
  }
});

test("real 2006 Jets kickoff-return touchdown establishes Colts' four-point deficit after next-drive XP", () => {
  const result = analyze(fixture(2006, 261001020), "comeback");
  expect(
    result.candidates.find((c) => c.value === 4 && c.clock === "Q4 2:20"),
  ).toMatchObject({
    clock: "Q4 2:20",
    remainingSeconds: 140,
  });
});

test("split conversion score cannot be silently paired with the pre-conversion deficit", () => {
  const g = game([
    drive("B", [0, 6], [play("RUSH", "Q4 1:05", 10, 10)], "Touchdown"),
    drive(
      "A",
      [8, 7],
      [
        play("XP", "Q4 1:00"),
        play("K", "Q4 1:00"),
        play("PASS", "Q4 0:05", 50, 50),
        play("2PTC", "Q4 0:00"),
      ],
      "Touchdown",
    ),
  ]);
  const result = analyze(g, "comeback");
  expect(result.candidates).toEqual([]);
  expect(result.exclusions.join(" ")).toMatch(/does not include.*conversion/);
});

test("successful two-point conversion text cannot be paired with a split six-point drive score", () => {
  for (const type of ["_TwoPointPass", "_TwoPointRush"]) {
    const conversion = {
      ...play(type, "Q4 1:00"),
      text: "TWO-POINT CONVERSION ATTEMPT. ATTEMPT SUCCEEDS.",
    };
    const g = game([
      drive("B", [0, 6], [play("RUSH", "Q4 1:05", 10, 10)], "Touchdown"),
      drive(
        "A",
        [9, 8],
        [conversion, play("K", "Q4 1:00"), play("PASS", "Q4 0:05", 50, 50)],
        "Touchdown",
      ),
    ]);
    const result = analyze(g, "comeback");
    expect(result.candidates).toEqual([]);
    expect(result.exclusions.join(" ")).toMatch(/does not include.*conversion/);
  }
});

test.each([
  [400554400, 3, "Q2 0:00", 1800],
  [400554374, 4, "Q3 0:00", 900],
] as const)(
  "period-end scoring marker takes precedence over a later-period kickoff (%s)",
  (id, value, clock, remainingSeconds) => {
    const result = analyze(fixture(2014, id), "comeback");
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value, clock, remainingSeconds }),
      ]),
    );
  },
);

test("a later-period kickoff alone cannot supply a missing post-score clock", () => {
  const g = game([
    drive("B", [0, 3], [play("FG", "Q2 0:03")], "Field Goal"),
    drive(
      "A",
      [7, 3],
      [
        play("K", "Q3 15:00"),
        play("PASS", "Q4 0:05", 50, 50),
        play("XP", "Q4 0:00"),
      ],
      "Touchdown",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toEqual([]);
  expect(analyze(g, "comeback").exclusions.join(" ")).toMatch(/post-score/i);
});

test("real Giants Super Bowl winning march includes the challenged catch mentioning a timeout", () => {
  const result = analyze(fixture(2011, 320205017), "march");
  expect(result.candidates).toMatchObject([
    { value: 88, clock: "Q4 3:46", startYardsToEndzone: 88 },
  ]);
  expect(result.exclusions).toEqual([]);
});

test("a live play mentioning a challenge timeout remains offensive and a valid scoring event", () => {
  const scoring = {
    ...play("PASS", "Q4 1:05", 50, 50),
    text: "Quarterback pass for 50 yards, TOUCHDOWN. The challenge failed. (Timeout #1.)",
  };
  const g = game([
    drive("B", [0, 7], [scoring, play("XP", "Q4 1:00")], "Touchdown"),
    drive(
      "A",
      [8, 7],
      [{ ...scoring, clock: "Q4 0:05" }, play("2PTC", "Q4 0:00")],
      "Touchdown",
    ),
  ]);
  expect(analyze(g, "comeback").candidates).toMatchObject([
    { value: 7, clock: "Q4 1:00" },
  ]);
  expect(analyze(g, "march").candidates).toMatchObject([
    { value: 50, clock: "Q4 0:05" },
  ]);
});

test("March rejects a winning score contradicted by explicit touchdown conversion evidence", () => {
  const g = game([
    drive(
      "B",
      [0, 7],
      [play("PASS", "Q4 2:05", 50, 50), play("XP", "Q4 2:00")],
      "Touchdown",
    ),
    drive(
      "A",
      [8, 7],
      [play("PASS", "Q4 1:05", 80, 80), play("XP", "Q4 1:00")],
      "Touchdown",
    ),
  ]);
  const result = analyze(g, "march");
  expect(result.candidates).toEqual([]);
  expect(result.exclusions.join(" ")).toMatch(/does not include.*conversion/);
});
