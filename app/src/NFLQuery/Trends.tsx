import { useMemo, useState } from "react";
import Data, { BoxScoreType, DataType } from "./Data";
import { allYears } from "./Fetch";

var initialized = false;

// player: (year)(traded)(consistent/died/injured)[]

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  useMemo(() => {
    if (!initialized) {
      initialized = true;
      Data(allYears).then(updateData);
    }
  }, []);
  return datas === null ? null : <SubTrends datas={datas} />;
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

function SubTrends(props: { datas: DataType[] }) {
  return (
    <pre>
      {JSON.stringify(
        groupByF(
          props.datas
            .flatMap((d) => d.games.map((g) => ({ g, d })))
            .filter((o) => o.g.week > 0)
            .flatMap((o) => o.g.teams.map((t) => ({ t, ...o })))
            .flatMap((o) =>
              getPlayerScores(o.t.boxScore).map((oo) => ({ ...o, ...oo }))
            )
            .map((o) => ({
              year: o.d.year,
              name: o.name,
              score: o.score,
            })),
          (o) => o.name
        )
          .map((o) => ({
            name: o.key,
            years: groupByF(o.group, (g) => g.year)
              .map((oo) => ({
                year: oo.key,
                scores: oo.group.map(({ score }) => score),
              }))
              .map((o) => ({
                ...o,
                total: o.scores.reduce((a, b) => a + b, 0),
              }))
              .filter(({ total }) => total >= 450),
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
    score: group
      .map((g) => getScore(g.p.stats, g.b))
      .reduce((a, b) => a + b, 0),
  }));
}

const scoring = {
  passing: { YDS: 0.04, TD: 4, INT: -2 },
  rushing: { YDS: 0.1, TD: 6 },
  receiving: { REC: 1, YDS: 0.1, TD: 6 },
  fumbles: { LOST: -2 },
} as {
  [k1: string]: { [k2: string]: number };
};
function getScore(stats: string[], b: BoxScoreType): number {
  return Object.entries(scoring[b.category] || {})
    .map(([label, value]) => parseFloat(stats[b.labels.indexOf(label)]) * value)
    .reduce((a, b) => a + b, 0);
}
