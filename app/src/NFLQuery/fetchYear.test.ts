import { fetchCompletedGameIds } from "./fetchYear";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function event(id: number, year: number, slug = "regular-season", state = "post") {
  return {
    id: String(id),
    season: { year, slug },
    status: { type: { state } },
    competitions: [{ type: { abbreviation: "STD" }, notes: [] }],
  };
}

test("includes January and playoff games while excluding other seasons and unfinished games", async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [
      event(1, 2025), event(2, 2026), event(3, 2026, "preseason"),
      event(4, 2026, "regular-season", "pre"),
      { ...event(5, 2026), competitions: [{ type: { abbreviation: "ALLSTAR" } }] },
    ] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [
      event(2, 2026), event(6, 2026), event(7, 2026, "post-season"), event(8, 2027),
    ] }) });
  global.fetch = fetchMock;

  expect(await fetchCompletedGameIds(2026)).toEqual([2, 6, 7]);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=2026",
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=2027",
  ]);
});

test("reports failed scoreboard requests instead of silently returning no games", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });
  await expect(fetchCompletedGameIds(2026)).rejects.toThrow("Scoreboard 2026: 400");
});
