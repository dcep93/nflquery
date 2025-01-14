import { useState } from "react";
import { GameType, TeamStatistic } from "./Data";

// https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c

const startYear = 2004;
const endYear = 2024;
export const allYears = Array.from(new Array(endYear - startYear + 1)).map(
  (_, i) => startYear + i
);

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
      .then((years) =>
        allYears.map((year, yearIndex) =>
          Promise.resolve()
            .then(
              () =>
                new Promise((resolve) => setTimeout(resolve, 1000 * yearIndex))
            )
            .then(() =>
              update({ ...state, startedYears: ++state.startedYears })
            )
            .then(() => getGames(year))
            .then((games: GameType[]) => ({ year, games }))
            .then((s) => JSON.stringify(s))
            .then(clog)
            .then(() => update({ ...state, endedYears: ++state.endedYears }))
        )
      )
      .then((ps) => Promise.all(ps))
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
        }[];
      }) =>
        resp.events
          .filter((e) => !e.name.toUpperCase().includes("NFC"))
          .filter((e) => e.season.slug !== "preseason")
          .filter((e) => e.status.type.state === "post")
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
              fetch(
                `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/summary?region=us&lang=en&contentorigin=espn&event=${gameId}`
              )
                .then((resp) => resp.json())
                .then(releaseTicket)
                .then(
                  (obj: {
                    header: {
                      week: number;
                      season: { type: number };
                      competitions: [{ date: string }];
                    };
                    drives: {
                      previous: {
                        team: { abbreviation: string };
                        description: string;
                        displayResult: string;
                        plays: {
                          shortDownDistanceText: string;
                          yardsToEndzone: number;
                          awayScore: number;
                          homeScore: number;
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
                      week: obj.header.season.type === 3 ? -1 : obj.header.week,
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
                      playByPlay: obj.drives.previous
                        .map((drive) => ({
                          team: drive.team?.abbreviation || "",
                          result: drive.displayResult,
                          plays: drive.plays.map((p: any) => ({
                            down: p.start.shortDownDistanceText,
                            text: p.text,
                            clock: `Q${p.period.number} ${p.clock.displayValue}`,
                            distance: p.statYardage,
                            startYardsToEndzone: p.start.yardsToEndzone,
                          })),
                          description: drive.description,
                          score: (
                            ["awayScore", "homeScore"] as [
                              "awayScore",
                              "homeScore"
                            ]
                          ).map((k) => drive.plays[drive.plays.length - 1][k]),
                        }))
                        .map(({ score, ...pbp }) => ({
                          ...pbp,
                          homeAdvantage: score[1] - score[0],
                        })),
                    };
                  }
                )
            )
        )
    )
    .then((ps) => Promise.all(ps));
}

var tickets = 64;
const queue: (() => void)[] = [];
function getTicket(): Promise<void> {
  if (tickets > 0) {
    tickets -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseTicket<T>(t: T) {
  const p = queue.shift();
  if (p) {
    p();
  } else {
    tickets += 1;
  }
  return t;
}

export function fClog<T>(t: T, f: (tt: T) => any): T {
  console.log(f(t));
  return t;
}

export function clog<T>(t: T): T {
  console.log(t);
  return t;
}
