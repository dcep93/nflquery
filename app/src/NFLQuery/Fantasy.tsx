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

export default function PlayerYearScores() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  Data(allYears).then(updateData);
  return datas === null ? null : (
    <pre style={{ whiteSpace: "unset" }}>
      {JSON.stringify(datasToPlayerYearScores(datas))}
    </pre>
  );
}

export type FantasyYear = { year: number; scores: number[]; total: number };

type PlayerYearScoresType = {
  name: string;
  years: FantasyYear[];
}[];

export function datasToPlayerYearScores(
  datas: DataType[]
): PlayerYearScoresType {
  return groupByF(
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
}

function groupByF<T, U>(ts: T[], f: (t: T) => U): { key: U; group: T[] }[] {
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
