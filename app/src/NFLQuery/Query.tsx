import { useState } from "react";
import Data, { DataType } from "./Data";
import Comeback from "./queries/Comeback";

var initialized = false;

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data([2024]).then(updateDatas);
  }
  if (datas === null) return null;
  return (
    <pre style={{ whiteSpace: "pre-wrap" }}>
      {JSON.stringify(Comeback(datas), null, 2)}
    </pre>
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
