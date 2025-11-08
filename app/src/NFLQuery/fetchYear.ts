import { endYear } from "./constants";
import { GameType, TeamStatistic } from "./types";

// https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c

function fetchLatestYear() {
  Promise.resolve(endYear)
    .then((year) => fetchYear(year).then((games) => ({ year, games })))
    .then(console.log);
}

export function fetchYear(year: number): Promise<GameType[]> {
  return fetchCompletedGameIds(year)
    .then((gameIds) =>
      gameIds.filter((gameId) => !EXCLUDED_GAME_IDS.has(gameId))
    )
    .then((gameIds) =>
      Promise.all(gameIds.map((gameId) => fetchSummaryGame(gameId)))
    );
}

var errored = false;
var tickets = 64;
const queue: (() => void)[] = [];

function getTicket(): Promise<void> {
  if (errored) {
    return Promise.reject(new Error("ticket acquisition halted"));
  }
  if (tickets > 0) {
    tickets -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseTicket() {
  if (errored) {
    return;
  }
  const next = queue.shift();
  if (next) {
    next();
  } else {
    tickets += 1;
  }
}

const EXCLUDED_GAME_IDS = new Set<number>([
  0,
  // chiefs broncos 2004
  241106007,
  // giants saints 2005
  250919018,
  // jets bills 2014
  400554331,
  // redskins eagles 2014
  400554366,
  // bucs dolphins 2017
  400951581,
  // bills bengals 2022
  401437947,
]);

const BAD_PLAY_IDS = [
  "2509180100001",
  "2509180030001",
  "2509180031889",
  "2509180260001",
  "2509180263362",
  "2509180263362",
  "2509180043999",
  "2509180130001",
  "2509250021008",
  "2509250022211",
  "2509250022986",
  "2509250024101",
  "2509180210001",
  "2509180210879",
  "2509180270001",
  "2509250141799",
  "2509250262647",
  //
  "400554280350",
  "4007915443540",
  "4007916793624",
  "4007916793624",
  "4008746122706",
  "4009517522936",
  "401030931785",
  "4010308312257",
  "401030954611",
  "4010308563241",
  "401127963965",
  "401127989330",
  "401220161627",
  "4012202542671",
  "401326405790",
  "4013264122580",
  "401671770283",
];

const PLAY_TYPE_OVERRIDES: { [key: string]: string } = {
  "3": "_PassIncomplete",
  "7": "_Sack",
  "9": "_FumbleRecoeryOwn",
  "12": "_KickoffReturnOff",
  "14": "_PuntReturn",
  "15": "_TwoPointPass",
  "16": "_TwoPointRush",
  "29": "_FumbleRecoveryOpp",
  "30": "_MuffedPuntRecoveryOpp",
  "43": "_BlockedPat",
  "70": "_CoinToss",
};

const DRIVE_TEAM_OVERRIDES: { [key: string]: string } = {
  "40095174822": "BUF",
  "4013265080": "WSH",
};

export async function fetchCompletedGameIds(year: number): Promise<number[]> {
  const resp = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=${year}0801-${
      year + 1
    }0401`
  );
  const data = (await resp.json()) as ScoreboardResponse;
  const events = data.events ?? [];

  const ids = events
    .filter((event) => event.season.slug !== "preseason")
    .filter((event) => event.status.type.state === "post")
    .filter((event) => {
      const competition = event.competitions?.[0];
      if (!competition) {
        return false;
      }
      if (competition.type?.abbreviation === "ALLSTAR") {
        return false;
      }
      const normalizedNotes = (competition.notes || [])
        .map((note) => note?.headline?.toLowerCase?.() || "")
        .filter(Boolean);
      return !normalizedNotes.some((headline) =>
        ["pro bowl", "at hawaii"].includes(headline)
      );
    })
    .map((event) => parseInt(event.id, 10))
    .filter((gameId) => !Number.isNaN(gameId))
    .filter((gameId) => !EXCLUDED_GAME_IDS.has(gameId));

  return Array.from(new Set(ids));
}

export async function fetchSummaryGame(gameId: number): Promise<GameType> {
  let hasTicket = false;
  try {
    await getTicket();
    hasTicket = true;
    const resp = await fetch(
      `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/summary?region=us&lang=en&contentorigin=espn&event=${gameId}`
    );
    const data = (await resp.json()) as SummaryResponse;
    const game = convertSummaryToGame(gameId, data);
    return {
      ...game,
      scores:
        game.drives[game.drives.length - 1]?.scores ??
        ([0, 0] as [number, number]),
    };
  } catch (error) {
    errored = true;
    throw error;
  } finally {
    if (hasTicket) {
      releaseTicket();
    }
  }
}

type ScoreboardResponse = {
  events?: {
    id: string;
    season: { slug: string };
    status: { type: { state: string } };
    competitions?: [
      {
        type?: { abbreviation?: string };
        notes?: { headline?: string }[];
      },
    ];
  }[];
};

type SummaryResponse = {
  header: {
    week: number;
    season: { type: number; year: number };
    competitions: [{ date: string }];
  };
  drives?: {
    previous?: SummaryDrive[];
  };
  boxscore: {
    teams: {
      team: { abbreviation: string };
      statistics: { name: TeamStatistic; displayValue: string }[];
    }[];
    players?: {
      statistics: {
        name: string;
        labels: string[];
        athletes: {
          athlete: { displayName: string };
          stats: string[];
        }[];
      }[];
    }[];
  };
};

type SummaryDrive = {
  id: string;
  team?: { abbreviation?: string };
  description: string;
  displayResult: string;
  plays?: SummaryPlay[];
};

type SummaryPlay = {
  id: string;
  type?: { abbreviation?: string; id?: string; text?: string };
  scoringType?: { abbreviation?: string; displayName?: string };
  text?: string;
  period?: { number?: string | number };
  clock?: { displayValue?: string };
  statYardage?: number;
  start?: { shortDownDistanceText?: string; yardsToEndzone?: number };
  awayScore?: number;
  homeScore?: number;
};

function convertSummaryToGame(
  gameId: number,
  summary: SummaryResponse
): GameType {
  const teams = summary.boxscore.teams.map((team, index) => ({
    name: team.team.abbreviation,
    statistics: Object.fromEntries(
      team.statistics.map((stat) => [stat.name, stat.displayValue])
    ) as { [key in TeamStatistic]?: string },
    boxScore:
      summary.boxscore.players?.[index]?.statistics?.map((stat) => ({
        category: stat.name,
        labels: stat.labels,
        players: stat.athletes.map((athlete) => ({
          name: athlete.athlete.displayName,
          stats: athlete.stats,
        })),
      })) ?? [],
  }));

  const drives = (summary.drives?.previous || [])
    .map((drive) => {
      const plays = (drive.plays || []).map((play) => {
        const playTypeOverrideKey = String(play.type?.id ?? "");
        const playType =
          play.type?.abbreviation ||
          play.scoringType?.abbreviation ||
          PLAY_TYPE_OVERRIDES[playTypeOverrideKey] ||
          (BAD_PLAY_IDS.includes(play.id)
            ? `bad.${play.id}`
            : summary.header.season.year === 2004
              ? `2004.${play.id}`
              : `ctag.play.type:${play.id}`);

        const playText =
          play.text ||
          play.type?.text ||
          play.scoringType?.displayName ||
          (BAD_PLAY_IDS.includes(play.id)
            ? `bad.${play.id}`
            : `ctag.play.type:${play.id}`);

        const periodNumber = play.period?.number;
        const clockDisplay = play.clock?.displayValue ?? "";
        const clockPrefix =
          periodNumber !== undefined && periodNumber !== ""
            ? `Q${periodNumber}`
            : "";
        const clock = [clockPrefix, clockDisplay]
          .filter((part) => part.length > 0)
          .join(" ");

        return {
          type: playType,
          down: play.start?.shortDownDistanceText || "",
          text: playText,
          clock,
          distance: play.statYardage ?? 0,
          startYardsToEndzone: play.start?.yardsToEndzone ?? 0,
        };
      });

      const lastPlay = drive.plays?.[drive.plays.length - 1];

      return {
        team:
          drive.team?.abbreviation ||
          DRIVE_TEAM_OVERRIDES[drive.id] ||
          `ctag.team:${drive.id}`,
        description: drive.description,
        result: drive.displayResult,
        plays,
        scores: [lastPlay?.awayScore ?? 0, lastPlay?.homeScore ?? 0] as [
          number,
          number,
        ],
      };
    })
    .filter((drive) => drive.plays.length > 0);

  return {
    gameId,
    timestamp: new Date(summary.header.competitions[0].date).getTime(),
    week: summary.header.week * (summary.header.season.type === 3 ? -1 : 1),
    teams,
    drives,
    scores: [0, 0],
  };
}
