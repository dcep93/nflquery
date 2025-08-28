import { useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores, FantasyYear } from "./Fantasy";
import { allYears } from "./Fetch";

// player: (year)(traded)(consistent/died/injured)[]

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  Data(allYears).then(updateData);
  return datas === null ? null : (
    <pre>
      {JSON.stringify(
        datasToPlayerYearScores(datas.filter((d) => d.year >= 2020))
          .filter((p) => p.name.includes("Amon"))
          .map(({ name, years }) => ({
            name,
            years: years.map((year) => classify(year)),
          })),
        null,
        2
      )}
    </pre>
  );
}

function classify(year: FantasyYear): string {
  return JSON.stringify(year);
}
