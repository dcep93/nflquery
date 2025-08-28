import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores } from "./Fantasy";
import { allYears } from "./Fetch";

const MIN_YEARS_EXP = 6;
const MIN_BEST_SCORE = 200;

const start = Date.now();

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
      years: o.years.map(
        (year) =>
          year.scores
            .slice(0, -2)
            .sort((a, b) => a - b)
            .map((v, i) => ({ v, i }))
            .find(({ v }) => v > 0)?.i || -1
      ),
    }));
  return (
    <pre>
      {JSON.stringify(
        { count: output.length, duration: Date.now() - start, output },
        null,
        2
      )}
    </pre>
  );
}
