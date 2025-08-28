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
            .flatMap((o) => o.g.teams.map((t) => ({ t, ...o })))
            .flatMap((o) => o.t.boxScore.map((b) => ({ b, ...o })))
            .flatMap((o) => o.b.players.map((p) => ({ p, ...o })))
            .map((o) => ({
              keys: {
                year: o.d.year,
                name: o.p.name,
              },
              score: getScore(o.p.stats, o.b),
            }))
            .filter((o) => o.keys.name === "Robbie Chosen"),
          (o) => `${o.keys.year}: ${o.keys.name}`
        )
          .map(({ group }) => ({
            keys: group[0].keys,
            scores: group.map(({ score }) => score),
          }))
          .map((o) => ({ ...o, total: o.scores.reduce((a, b) => a + b, 0) }))
          .map(
            (o) =>
              `${o.keys.year}: ${o.keys.name}: ${o.total} / ${o.scores.map((s) => s.toFixed(2))}`
          ),
        null,
        2
      )}
    </pre>
  );
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
