import { useEffect, useState } from "react";
import Data, { DataType, PlayType } from "./Data";
import { allYears } from "./Fetch";
import CustomQuery, { CustomQueryEditor } from "./queries/CustomQuery";
import PuntAverages from "./queries/PuntAverages";

var initialized = false;
const allQueries = {
  PuntAverages,
  CustomQuery,
};

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data(allYears).then(updateDatas);
  }
  const rawHash = window.location.hash.slice(1);
  const [hash, updateHash] = useState<string>(
    allQueries[rawHash.split(".")[0] as keyof typeof allQueries]
      ? rawHash
      : Object.keys(allQueries)[0]
  );
  const queryName = hash.split(".")[0];
  const query = allQueries[queryName as keyof typeof allQueries];
  const [output, updateOutput] = useState("NFLQuery");
  useEffect(() => {
    window.location.hash = hash;
    datas &&
      Promise.resolve(datas)
        .then(query.getPoints)
        .then((o) => JSON.stringify(o, null, 2))
        .then(updateOutput);
  }, [hash, datas]);
  if (!datas) return <div>fetching...</div>;
  return (
    <div>
      <div style={{ display: "flex" }}>
        <div>
          <select
            onChange={(e) => updateHash((e.target as HTMLSelectElement).value)}
          >
            {Object.keys(allQueries).map((q) => (
              <option key={q} selected={q === queryName}>
                {q}
              </option>
            ))}
          </select>
        </div>
        <div>
          <CustomQueryEditor
            updateHash={updateHash}
            custom={query.custom}
            datas={datas}
          />
        </div>
      </div>
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{output}</pre>
      </div>
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
