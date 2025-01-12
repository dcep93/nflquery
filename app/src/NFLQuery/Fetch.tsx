import { useState } from "react";

// https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c

// 14,15,16 bad
const startYear = 2004;
const endYear = 2004;
var fetching = false;

var tickets = 64;
const queue: (() => void)[] = [];
function getTicket(): Promise<void> {
  if (tickets > 0) {
    tickets -= 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function releaseTicket() {
  tickets += 1;
  const p = queue.pop();
  if (p) p();
}

function clog<T>(t: T): T {
  console.log(t);
  return t;
}

export default function Fetch() {
  const [state, update] = useState({
    startedJobs: 0,
    endedJobs: 0,
    startedYears: 0,
    endedYears: 0,
    startedTickets: 0,
    endedTickets: 0,
  });
  if (!fetching) {
    fetching = true;
    Promise.resolve()
      .then(() => update({ ...state, startedJobs: ++state.startedJobs }))
      .then(() =>
        Array.from(new Array(endYear - startYear + 1)).map(
          (_, i) => startYear + i
        )
      )
      .then((years) =>
        years.map((year, yearIndex) =>
          Promise.resolve()
            .then(() =>
              update({ ...state, startedYears: ++state.startedYears })
            )
            .then(
              () =>
                new Promise((resolve) => setTimeout(resolve, 1000 * yearIndex))
            )
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
                  season: { slug: string };
                  status: { type: { state: string } };
                }[];
              }) =>
                resp.events
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
                      // giants saints 2005
                      250919018,
                      // cancelled bills bengals
                      401437947,
                    ].includes(gameId)
                )
                .map((gameId) =>
                  Promise.resolve()
                    .then(() =>
                      update({
                        ...state,
                        startedTickets: ++state.startedTickets,
                      })
                    )
                    .then(getTicket)
                    .then(() =>
                      fetch(
                        `https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/summary?region=us&lang=en&contentorigin=espn&event=${gameId}`
                      )
                        .then((resp) => resp.json())
                        .then(
                          (obj: {
                            drives: {
                              previous: {
                                team: { abbreviation: string };
                                description: string;
                                displayResult: string;
                                plays: {
                                  shortDownDistanceText: string;
                                  yardsToEndzone: number;
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
                                team: { name: string };
                                statistics: {
                                  name: string;
                                  displayValue: string;
                                }[];
                              }[];
                            };
                          }) => {
                            releaseTicket();
                            update({
                              ...state,
                              endedTickets: ++state.endedTickets,
                            });
                            const playByPlay = obj.drives.previous.map(
                              (drive) => ({
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
                              })
                            );
                            const game = {
                              gameId,
                              timestamp: 0,
                              teams: obj.boxscore.teams.map((t, index) => ({
                                name: t.team.name,
                                statistics: Object.fromEntries(
                                  t.statistics.map((s) => [
                                    s.name,
                                    s.displayValue,
                                  ])
                                ) as { [key in TeamStatistic]: string },
                                boxScore: obj.boxscore.players[
                                  index
                                ].statistics.map((s) => ({
                                  category: s.name,
                                  labels: s.labels,
                                  players: s.athletes.map((a) => ({
                                    name: a.athlete.displayName,
                                    stats: a.stats,
                                  })),
                                })),
                              })),
                              playByPlay,
                            };
                            return game;
                          }
                        )
                    )
                )
            )

            .then((ps) => Promise.all(ps))
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

export type Data = {
  year: string;
  games: GameType[];
};

export type GameType = {
  gameId: number;
  timestamp: number;
  teams: {
    name: string;
    statistics: { [key in TeamStatistic]: string };
    boxScore: BoxScoreType[];
  }[];
  playByPlay: DriveType[];
};

export enum TeamStatistic {
  firstDowns,
  firstDownsPassing,
  firstDownsRushing,
  firstDownsPenalty,
  thirdDownEff,
  fourthDownEff,
  totalOffensivePlays,
  totalYards,
  yardsPerPlay,
  totalDrives,
  netPassingYards,
  completionAttempts,
  yardsPerPass,
  interceptions,
  sacksYardsLost,
  rushingYards,
  rushingAttempts,
  yardsPerRushAttempt,
  redZoneAttempts,
  totalPenaltiesYards,
  turnovers,
  fumblesLost,
  defensiveTouchdowns,
  possessionTime,
}

export type DriveType = {
  team: string;
  description: string;
  result: string;
  plays: PlayType[];
};

export type PlayType = {
  down: string;
  text: string;
  clock: string;
  distance: number;
  startYardsToEndzone: number;
};

export type BoxScoreType = {
  category: string;
  labels: string[];
  players: { name: string; stats: string[] }[];
};
