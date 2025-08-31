import { useState } from "react";
import Data, { DataType } from "./Data";
import { allYears } from "./Fetch";

const scoring = {
  passing: { YDS: 0.04, TD: 4, INT: -2 },
  rushing: { YDS: 0.1, TD: 6 },
  receiving: { REC: 1, YDS: 0.1, TD: 6 },
  fumbles: { LOST: -2 },
} as {
  [k1: string]: { [k2: string]: number };
};

declare global {
  interface Window {
    fantasyData: PlayerYearScoresType;
  }
}

var initialized = false;
export default function PlayerYearScores() {
  const [state, updateState] = useState("fetching");
  const [filterStr, updateFilterStr] = useState("Tom Brady");
  if (!initialized) {
    initialized = true;
    Data(allYears)
      .then(datasToPlayerYearScores)
      .then((output) => {
        window.fantasyData = output;
        updateState(
          [
            `JSON.stringify(window.fantasyData).length = ${JSON.stringify(window.fantasyData).length}`,
            `${JSON.stringify(
              window.fantasyData.find((p) => p.name.includes(filterStr)),
              null,
              2
            )}`,
          ].join("\n\n")
        );
      });
  }
  return (
    <div>
      <pre>{state}</pre>
      <div>
        filterStr:{" "}
        <input
          value={filterStr}
          onChange={(e) => updateFilterStr(e.target!.value)}
        />
      </div>
    </div>
  );
}

export type FantasyYear = { year: number; scores: number[]; total: number };

export type PlayerYearScoresType = {
  name: string;
  position: string;
  total: number;
  years: FantasyYear[];
}[];

type ScoreType = { name: string; category: string };

export function datasToPlayerYearScores(
  datas: DataType[]
): PlayerYearScoresType {
  const allScores: ScoreType[] = [];
  const rawScores = groupByF(
    datas
      .map((d) => ({
        d,
        numWeeks: d.games.map((g) => g.week).sort((a, b) => b - a)[0],
      }))
      .flatMap(({ d, numWeeks }) =>
        groupByF(
          d.games
            .map((g) => ({ g }))
            .flatMap((o) => o.g.teams.map((t) => ({ t, ...o })))
            .flatMap((o) =>
              groupByF(
                o.t.boxScore.flatMap((b) => b.players.map((p) => ({ p, b }))),
                ({ p }) => p.name
              )
                .map((o) => {
                  allScores.push(
                    ...o.group.map((oo) => ({
                      name: oo.p.name,
                      category: oo.b.category,
                    }))
                  );
                  return o;
                })
                .map(({ key, group }) => ({
                  name: key,
                  score: float2(
                    group
                      .map((g) =>
                        Object.entries(scoring[g.b.category] || {})
                          .map(
                            ([label, value]) =>
                              parseFloat(g.p.stats[g.b.labels.indexOf(label)]) *
                              value
                          )
                          .reduce((a, b) => a + b, 0)
                      )
                      .reduce((a, b) => a + b, 0)
                  ),
                }))
                .map((oo) => ({
                  ...o,
                  ...oo,
                }))
            ),
          (o) => o.name
        )
          .map(({ key, group }) => ({
            name: key,
            scoresByWeek: Object.fromEntries(
              group.map((o) => [o.g.week, o.score])
            ),
          }))
          .map(({ name, scoresByWeek }) => ({
            name,
            year: d.year,
            scores: Array.from(new Array(numWeeks)).map(
              (_, weekNumMinusOne) => scoresByWeek[weekNumMinusOne + 1] || 0
            ),
          }))
          .filter(({ scores }) => scores.find((s) => s !== 0))
          .map((o) => ({
            ...o,
            total: float2(o.scores.reduce((a, b) => a + b, 0)),
          }))
      ),
    (o) => o.name
  ).map(({ key, group }) => ({
    name: key,
    years: group.map(({ name, ...o }) => o),
  }));
  const nameToScores = Object.fromEntries(
    groupByF(allScores, (s) => s.name).map(({ key, group }) => [
      key,
      classifyPosition(group),
    ])
  );
  return rawScores
    .map((o) => ({
      position: nameToScores[o.name] || "X",
      total: float2(o.years.flatMap((y) => y.total).reduce((a, b) => a + b, 0)),
      ...o,
    }))
    .sort((a, b) => b.total - a.total);
}

function classifyPosition(scores: ScoreType[]): string {
  const grouped = Object.fromEntries(
    groupByF(scores, (s) => s.category).map(({ key, group }) => [key, group])
  );
  if ((grouped.passing || []).length / scores.length >= 0.3) return "QB";
  if ((grouped.rushing || []).length / scores.length >= 0.3) return "RB";
  if ((grouped.receiving || []).length / scores.length >= 0.3) return "WR";
  if ((grouped.fumbles || []).length / scores.length >= 0.3) return "FUMBLE";
  return "X";
}

export function groupByF<T, U>(
  ts: T[],
  f: (t: T) => U
): { key: U; group: T[] }[] {
  return Array.from(
    ts
      .reduce(
        (prev, curr) => {
          const key = f(curr);
          if (!prev.has(key)) prev.set(key, []);
          prev.get(key)!.push(curr);
          return prev;
        },
        new Map() as Map<U, T[]>
      )
      .entries()
  ).map(([key, group]) => ({ key: key as U, group }));
}

function float2(f: number) {
  return parseFloat(f.toFixed(2));
}
