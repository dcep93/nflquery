import { useState } from "react";
import { allYears, endYear, GameType, TeamStatistic } from "./Data";

// https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c

// pbpaste | python3 pasteToFiles.py

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

var initialized = false;

export default function Fetch() {
  const [state, update] = useState({
    startedJobs: 0,
    endedJobs: 0,
    startedYears: 0,
    endedYears: 0,
    // startedTickets: 0,
    // endedTickets: 0,
  });
  if (!initialized) {
    initialized = true;
    Promise.resolve()
      .then(() => update({ ...state, startedJobs: ++state.startedJobs }))
      .then(() =>
        allYears
          .filter((year) => year === endYear)
          .map((year, yearIndex) =>
            Promise.resolve()
              .then(
                () =>
                  new Promise((resolve) =>
                    setTimeout(resolve, 1000 * yearIndex)
                  )
              )
              .then(() =>
                update({ ...state, startedYears: ++state.startedYears })
              )
              .then(() => getGames(year))
              .then((games: GameType[]) => ({
                year,
                games,
              }))
              .then((data) =>
                Promise.resolve()
                  .then(() =>
                    update({ ...state, endedYears: ++state.endedYears })
                  )
                  .then(() => data)
              )
          )
      )
      .then((ps) => Promise.all(ps))
      .then((ds) => JSON.stringify(ds))
      .then(clog)
      .then(() => update({ ...state, endedJobs: ++state.endedJobs }));
  }
  return <pre>{JSON.stringify(state)}</pre>;
}

function getGames(year: number): Promise<GameType[]> {
  return Promise.resolve()
    .then(() =>
      fetch(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=1000&dates=${year}0801-${
          year + 1
        }0401`
      )
    )
    .then((resp) => resp.json())
    .then(
      (resp: {
        events: {
          id: string;
          name: string;
          season: { slug: string };
          status: { type: { state: string } };
          competitions: [
            { type: { abbreviation: string }; notes: [{ headline: string }] },
          ];
        }[];
      }) =>
        resp.events
          .filter((e) => e.season.slug !== "preseason")
          .filter((e) => e.status.type.state === "post")
          .filter(
            (e) =>
              e.competitions[0].type.abbreviation !== "ALLSTAR" &&
              !["pro bowl", "at hawaii"].includes(
                (
                  e.competitions[0].notes
                    .map((n) => n.headline)
                    .find((h) => h) || ""
                ).toLowerCase()
              )
          )
          .map((e) => parseInt(e.id))
    )
    .then((gameIds) =>
      gameIds
        .filter(
          (gameId) =>
            ![
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
            ].includes(gameId)
        )
        .map((gameId) =>
          Promise.resolve()
            .then(getTicket)
            .then(() =>
              // todo timeout and retry
              fetch(
                `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/summary?region=us&lang=en&contentorigin=espn&event=${gameId}`
              )
                .then((resp) => resp.json())
                .then(releaseTicket)
                .then(
                  (obj: {
                    header: {
                      week: number;
                      season: { type: number; year: number };
                      competitions: [{ date: string }];
                    };
                    drives: {
                      previous: {
                        id: string;
                        team: { abbreviation: string };
                        description: string;
                        displayResult: string;
                        plays: {
                          id: string;
                          shortDownDistanceText: string;
                          yardsToEndzone: number;
                          awayScore: number;
                          homeScore: number;
                          type: {
                            abbreviation: string;
                            id: string;
                            text: string;
                          };
                          scoringType: {
                            displayName: string;
                            abbreviation: string;
                          };
                          text: string;
                          start: {
                            shortDownDistanceText: string;
                            yardsToEndzone: number;
                          };
                          period: { number: string };
                          clock: { displayValue: string };
                          statYardage: number;
                        }[];
                      }[];
                    };
                    boxscore: {
                      players: {
                        statistics: {
                          name: string;
                          labels: string[];
                          athletes: {
                            athlete: { displayName: string };
                            stats: string[];
                          }[];
                        }[];
                      }[];
                      teams: {
                        team: { abbreviation: string };
                        statistics: {
                          name: string;
                          displayValue: string;
                        }[];
                      }[];
                    };
                  }) => {
                    if (!obj.drives) {
                      console.log({ year, gameId, obj });
                    }
                    return {
                      gameId,
                      timestamp: new Date(
                        obj.header.competitions[0].date
                      ).getTime(),
                      week:
                        obj.header.week *
                        (obj.header.season.type === 3 ? -1 : 1),
                      teams: obj.boxscore.teams.map((t, index) => ({
                        name: t.team.abbreviation,
                        statistics: Object.fromEntries(
                          t.statistics.map((s) => [s.name, s.displayValue])
                        ) as { [key in TeamStatistic]: string },
                        boxScore: obj.boxscore.players[index].statistics.map(
                          (s) => ({
                            category: s.name,
                            labels: s.labels,
                            players: s.athletes.map((a) => ({
                              name: a.athlete.displayName,
                              stats: a.stats,
                            })),
                          })
                        ),
                      })),
                      drives: obj.drives.previous
                        .map((drive) => ({
                          team: (drive.team?.abbreviation ||
                            { "40095174822": "BUF", "4013265080": "WSH" }[
                              drive.id
                            ] ||
                            ctag("team", { obj, drive, gameId }) ===
                              null)!.toString(),
                          result: drive.displayResult,
                          plays: drive.plays.map((p) => ({
                            type: (p.type?.abbreviation ||
                              p.scoringType?.abbreviation ||
                              {
                                3: "_PassIncomplete",
                                7: "_Sack",
                                9: "_FumbleRecoeryOwn",
                                12: "_KickoffReturnOff",
                                14: "_PuntReturn",
                                15: "_TwoPointPass",
                                16: "_TwoPointRush",
                                29: "_FumbleRecoveryOpp",
                                30: "_MuffedPuntRecoveryOpp",
                                43: "_BlockedPat",
                                70: "_CoinToss",
                              }[p.type?.id] ||
                              (BAD_PLAY_IDS.includes(p.id)
                                ? `bad.${p.id}`
                                : obj.header.season.year === 2004
                                  ? `2004.${p.id}`
                                  : ctag("play.type", {
                                      id: p.id,
                                      text: p.text,
                                      obj,
                                      p,
                                    }) === null ||
                                    `ctag.play.type:${p.id}`))!.toString(),
                            down: p.start.shortDownDistanceText,
                            text: (
                              p.text ||
                              p.type?.text ||
                              p.scoringType?.displayName ||
                              (BAD_PLAY_IDS.includes(p.id)
                                ? `bad.${p.id}`
                                : ctag("text", { id: p.id, obj, p }) === null ||
                                  `ctag.play.type:${p.id}`)
                            ).toString(),
                            clock: `Q${p.period.number} ${p.clock.displayValue}`,
                            distance: p.statYardage,
                            startYardsToEndzone: p.start.yardsToEndzone,
                          })),
                          description: drive.description,
                          lastPlay: drive.plays[drive.plays.length - 1],
                        }))
                        .map(({ lastPlay, ...pbp }) => ({
                          ...pbp,
                          scores: [lastPlay.awayScore, lastPlay.homeScore] as [
                            number,
                            number,
                          ],
                        })),
                    };
                  }
                )
                .then((game) => ({
                  ...game,
                  scores: game.drives[game.drives.length - 1].scores,
                }))
            )
            .catch((e) => {
              errored = true;
              throw e;
            })
        )
    )
    .then((ps) => Promise.all(ps));
}

var errored = false;
var tickets = 64;
const queue: (() => void)[] = [];
function getTicket(): Promise<void> {
  if (errored) return new Promise((resolve) => null);
  if (tickets > 0) {
    tickets -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseTicket<T>(t: T) {
  if (errored) return t;
  const p = queue.shift();
  if (p) {
    p();
  } else {
    tickets += 1;
  }
  return t;
}

export function fClog<T>(t: T, f: (tt: T) => any): T {
  clog(f(t));
  return t;
}

export function clog<T>(t: T): T {
  console.log(t);
  console.log(" ");
  return t;
}

const tags: { [tag: string]: number } = {};
export function ctag<T>(tag: string, t: T): T {
  tags[tag] = (tags[tag] || 0) + 1;
  clog({ ctag: tags[tag], tag, ...t });
  return t;
}
