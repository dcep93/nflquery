import { useState } from "react";
import Data, { DataType } from "./Data";
import Penalty from "./queries/Penalty";

var initialized = false;

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data([]).then(updateDatas);
  }
  if (datas === null) return null;
  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(Penalty(datas), null, 2)}
    </pre>
  );
}

export type GraphType = { x: number; y: number; label: string }[];

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
