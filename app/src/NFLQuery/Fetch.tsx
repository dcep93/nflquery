import { useState } from "react";

const startYear = 2004;
const endYear = 2024;
var fetching = false;

declare global {
  interface Window {
    chrome: any;
  }
}
var tickets = 32;
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
        years.map((year) =>
          Promise.resolve()
            .then(() =>
              update({ ...state, startedYears: ++state.startedYears })
            )
            .then(() =>
              fetch(
                // TODO better way to get all gameIds
                `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}?view=proTeamSchedules_wl`
              )
            )
            .then((resp) => resp.json())
            .then(
              (resp: {
                settings: {
                  proTeams: {
                    id: number;
                    name: string;
                    byeWeek: number;
                    proGamesByScoringPeriod: {
                      [scoringPeriodId: string]: {
                        id: number;
                        statsOfficial: boolean;
                      }[];
                    };
                  }[];
                };
              }) =>
                Array.from(
                  new Set(
                    resp.settings.proTeams
                      .flatMap((p) =>
                        Object.values(p.proGamesByScoringPeriod).map(
                          (a) => a[0]
                        )
                      )
                      .filter((o) => o.statsOfficial)
                      .map((o) => o.id)
                  )
                )
            )
            .then((gameIds) =>
              gameIds
                .filter(
                  (gameId) =>
                    ![
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
  "firstDowns",
  "firstDownsPassing",
  "firstDownsRushing",
  "firstDownsPenalty",
  "thirdDownEff",
  "fourthDownEff",
  "totalOffensivePlays",
  "totalYards",
  "yardsPerPlay",
  "totalDrives",
  "netPassingYards",
  "completionAttempts",
  "yardsPerPass",
  "interceptions",
  "sacksYardsLost",
  "rushingYards",
  "rushingAttempts",
  "yardsPerRushAttempt",
  "redZoneAttempts",
  "totalPenaltiesYards",
  "turnovers",
  "fumblesLost",
  "defensiveTouchdowns",
  "possessionTime",
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
