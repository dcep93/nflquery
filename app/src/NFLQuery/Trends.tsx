import { useMemo, useState } from "react";
import Data, { BoxScoreType, DataType } from "./Data";
import { allYears } from "./Fetch";

var initialized = false;

// player: (year)(traded)(consistent/died/injured)[]

const scoring = {
  passing: { YDS: 0.04, TD: 4, INT: -2 },
  rushing: { YDS: 0.1, TD: 6 },
  receiving: { REC: 1, YDS: 0.1, TD: 6 },
  fumbles: { LOST: -2 },
} as {
  [k1: string]: { [k2: string]: number };
};

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  useMemo(() => {
    if (!initialized) {
      initialized = true;
      Data(allYears).then(updateData);
    }
  }, []);
  return datas === null ? null : (
    <pre>
      {JSON.stringify(
        groupByF(
          datas
            .map((d) => ({
              d,
              numWeeks: d.games.map((g) => g.week).sort((a, b) => b - a)[0],
            }))
            .flatMap((o) =>
              o.d.games
                .filter((g) => g.week > 0)
                .sort((a, b) => a.week - b.week)
                .map((g) => ({ g, ...o }))
            )
            .flatMap((o) => o.g.teams.map((t) => ({ t, ...o })))
            .flatMap((o) =>
              getPlayerScores(o.t.boxScore).map((oo) => ({ ...o, ...oo }))
            )
            .map((o) => ({
              year: o.d.year,
              name: o.name,
              score: o.score,
              week: o.g.week,
              numWeeks: o.numWeeks,
            })),
          (o) => o.name
        )
          .map((o) => ({
            name: o.key,
            years: groupByF(o.group, (g) => g.year)
              .filter((oo) => o.key === "Christian McCaffrey")
              .map((oo) => ({
                year: oo.key,
                scoresByWeek: Object.fromEntries(
                  oo.group.map((ooo) => [ooo.week, ooo.score])
                ),
                numWeeks: oo.group[0].numWeeks,
              }))
              .map(({ year, scoresByWeek, numWeeks }) => ({
                year,
                scores: Array.from(new Array(numWeeks)).map(
                  (_, weekNumMinusOne) => scoresByWeek[weekNumMinusOne + 1] || 0
                ),
              }))
              .map((o) => ({
                ...o,
                total: float2(o.scores.reduce((a, b) => a + b, 0)),
              })),
          }))
          .filter(({ years }) => years.length > 0),
        null,
        2
      )}
    </pre>
  );
}

function getPlayerScores(
  boxScores: BoxScoreType[]
): { name: string; score: number }[] {
  return groupByF(
    boxScores.flatMap((b) => b.players.map((p) => ({ p, b }))),
    ({ p }) => p.name
  ).map(({ key, group }) => ({
    name: key,
    score: float2(
      group
        .map((g) =>
          Object.entries(scoring[g.b.category] || {})
            .map(
              ([label, value]) =>
                parseFloat(g.p.stats[g.b.labels.indexOf(label)]) * value
            )
            .reduce((a, b) => a + b, 0)
        )
        .reduce((a, b) => a + b, 0)
    ),
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
