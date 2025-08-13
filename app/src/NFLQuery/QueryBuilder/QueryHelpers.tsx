import { PlayType } from "../Data";

function groupByF<T, U>(ts: T[], f: (t: T) => U): { key: U; group: T[] }[] {
  return Array.from(
    ts
      .reduce((prev, curr) => {
        const key = f(curr);
        if (!prev.has(key)) prev.set(key, []);
        prev.get(key)!.push(curr);
        return prev;
      }, new Map() as Map<U, T[]>)
      .entries()
  ).map(([key, group]) => ({ key: key as U, group }));
}

function clockToSeconds(clock: string): number {
  const parts = clock.split(" ").reverse();
  return (
    parts[0]
      .split(":")
      .map((p, i) => (i === 0 ? 60 : 1) * parseInt(p))
      .reduce((a, b) => a + b, 0) +
    (parts.length === 1 ? 0 : 15 * 60 * (4 - parseInt(parts[1][1])))
  );
}

const totalGameSeconds = clockToSeconds("Q0 00:00");

function getHomeAdvantage(scores: [number, number]): number {
  return scores[1] - scores[0];
}

function secondsToClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${"0"
    .concat((seconds % 60).toString())
    .slice(-2)}`;
}

function isPlay(p: PlayType): boolean {
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

function mapDict<T, U>(
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

function homeIsWinning(scores: [number, number]): boolean {
  return scores[0] > scores[1];
}

declare global {
  interface Window {
    QueryHelpers: typeof QueryHelpers;
  }
}

const QueryHelpers = {
  groupByF,
  clockToSeconds,
  totalGameSeconds,
  getHomeAdvantage,
  secondsToClock,
  isPlay,
  mapDict,
  homeIsWinning,
};

export default QueryHelpers;
