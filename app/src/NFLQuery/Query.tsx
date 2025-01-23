import { useEffect, useState } from "react";
import Data, { DataType, PlayType } from "./Data";
import { allYears } from "./Fetch";
import Comeback from "./queries/Comeback";
import LongestDrive from "./queries/LongestDrive";
import March from "./queries/March";
import MinPossessionTime from "./queries/MinPossessionTime";
import Penalty from "./queries/Penalty";
import Q1Q3_4thDown from "./queries/Q1Q3_4thDown";
import Team4thDown from "./queries/Team4thDown";
import TeamHighScore from "./queries/TeamHighScore";
import TotalHighScore from "./queries/TotalHighScore";
import Year4thDown from "./queries/Year4thDown";

var initialized = false;
const allQueries = {
  Q1Q3_4thDown,
  March,
  Team4thDown,
  Comeback,
  MinPossessionTime,
  Year4thDown,
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

export type PointType = { x: number | string; y: number; label: string };

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

export function isPlay(p: PlayType): boolean {
  return (
    p.type !== "TO" &&
    p.type !== "Off TO" &&
    p.type !== "EH" &&
    p.type !== "2Min Warn" &&
    p.type !== "PEN" &&
    p.down !== " & -1" &&
    p.text !== undefined &&
    !p.text.toLowerCase().startsWith("start of") &&
    !p.text.toLowerCase().startsWith("end of") &&
    !p.text.toLowerCase().includes("two-minute warning") &&
    !p.text.toLowerCase().includes("2 minute warning") &&
    !p.text.toLowerCase().includes("timeout") &&
    !p.text.toLowerCase().includes("penalty")
  );
}

export function mapDict<T, U>(
  d: { [key: string]: T },
  f: (t: T) => U,
  g: (key: string, t: T) => boolean = () => true
) {
  return Object.fromEntries(
    Object.entries(d)
      .filter(([key, t]) => g(key, t))
      .map(([key, t]) => [key, f(t)])
  );
}
