import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores, groupByF } from "./Fantasy";
import { allYears } from "./Fetch";
import { bubbleStyle } from "./Query";

const MIN_YEARS_EXP = 6;
const MIN_BEST_SCORE = 200;

const INJURED_GAMES_THRESHOLD = 5;
const LOW = 0.2;
const HIGH = 0.4;

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  useMemo(() => {
    Data(allYears).then(updateData);
  }, []);
  if (datas === null) return null;
  const output = datasToPlayerYearScores(datas)
    .filter((o) => o.years.length >= MIN_YEARS_EXP)
    .map((o) => ({
      ...o,
      max: o.years.map((y) => y.total).sort((a, b) => b - a)[0],
    }))
    .filter((o) => o.max >= MIN_BEST_SCORE)
    .sort((a, b) => b.max - a.max)
    .map((o) => ({
      ...o,
      years: o.years.slice(1).map((year) => ({
        total: year.total,
        missed: year.scores
          .slice(0, -2)
          .sort((a, b) => a - b)
          .concat(1)
          .map((v, i) => ({ v, i }))
          .find(({ v }) => v > 0)!.i,
      })),
    }))
    .map((o) => ({ ...o, injuryRate: getInjuryRate(o) }))
    .sort((a, b) => a.injuryRate - b.injuryRate);
  const split = groupByF(output, (o) => o.injuryRate.toFixed(1));
  return (
    <div>
      <div style={bubbleStyle}>total count: {output.length}</div>
      <div style={{ display: "flex" }}>
        {split.map(({ key, group }) => (
          <div key={key}>
            <div style={bubbleStyle}>
              {key}: {group.length}
            </div>
            <pre>{JSON.stringify(group, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function getInjuryRate(player: {
  years: { missed: number }[];
  max: number;
  name: string;
  position: string;
}) {
  const x = player.years.map(({ missed }) => missed).sort((a, b) => b - a);
  const y = x
    .concat(-1)
    .findIndex((missed) => missed < INJURED_GAMES_THRESHOLD);
  const z = y / x.length;
  return z;
}

function classify(m: number) {
  if (m < 0) return "healthy";
  if (m <= LOW) return `[-,${LOW}]`;
  if (m < HIGH) return `(${LOW},${HIGH})`;
  return `[${HIGH},+]`;
}
