import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores, groupByF } from "./Fantasy";
import { allYears } from "./Fetch";
import { bubbleStyle } from "./Query";

const MIN_YEARS_EXP = 6;
const MIN_BEST_SCORE = 200;

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
    }));
  const split = groupByF(output, classify);
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

function classify(player: {
  years: { missed: number }[];
  max: number;
  name: string;
  position: string;
}) {
  const x = player.years.map(({ missed }) => missed).sort((a, b) => b - a);
  const y = x[Math.floor(x.length * 0.66)];
  if (y <= 3) return "[-,3]";
  if (y < 8) return "(3,8)";
  return "[8,+]";
  return y.toString();
}
