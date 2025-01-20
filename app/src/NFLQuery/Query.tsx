import { useEffect, useState } from "react";
import Data, { DataType } from "./Data";
import { allYears } from "./Fetch";
import _4th_down from "./queries/_4th_down";
import Comeback from "./queries/Comeback";
import LongestDrive from "./queries/LongestDrive";
import March from "./queries/March";
import MinPossessionTime from "./queries/MinPossessionTime";
import Penalty from "./queries/Penalty";
import TeamHighScore from "./queries/TeamHighScore";
import TotalHighScore from "./queries/TotalHighScore";

var initialized = false;
const allQueries = {
  March,
  _4th_down,
  Comeback,
  MinPossessionTime,
  Penalty,
  TeamHighScore,
  TotalHighScore,
  LongestDrive,
};

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data(allYears).then(updateDatas);
  }
  const [query, updateQuery] = useState<string>(
    window.location.hash.slice(1) || Object.keys(allQueries)[0]
  );
  window.location.hash = query;
  const [output, updateOutput] = useState("NFLQuery");
  useEffect(() => {
    datas &&
      Promise.resolve()
        .then(() => allQueries[query as keyof typeof allQueries](datas))
        .then((o) => JSON.stringify(o, null, 2))
        .then(updateOutput);
  }, [query, datas]);
  return (
    <div>
      <div>
        <select
          defaultValue={query}
          onChange={(e) => updateQuery((e.target as HTMLSelectElement).value)}
        >
          {Object.keys(allQueries).map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
      </div>
      <pre style={{ whiteSpace: "pre-wrap" }}>{output}</pre>
    </div>
  );
}

export type GraphType = { x: number | string; y: number; label: string }[];

export function groupByF<T>(
  ts: T[],
  f: (t: T) => string
): { [key: string]: T[] } {
  return ts.reduce((prev, curr) => {
    const key = f(curr);
    if (!prev[key]) prev[key] = [];
    prev[key]!.push(curr);
    return prev;
  }, {} as { [key: string]: T[] });
}

export function clockToSeconds(clock: string): number {
  const parts = clock.split(" ").reverse();
  return (
    parts[0]
      .split(":")
      .map((p, i) => (i === 0 ? 60 : 1) * parseInt(p))
      .reduce((a, b) => a + b, 0) +
    (parts.length === 1 ? 0 : 15 * 60 * (4 - parseInt(parts[1][1])))
  );
}

export const totalGameSeconds = clockToSeconds("Q0 00:00");

export function getHomeAdvantage(scores: [number, number]): number {
  return scores[1] - scores[0];
}

export function secondsToClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${"0"
    .concat((seconds % 60).toString())
    .slice(-2)}`;
}
