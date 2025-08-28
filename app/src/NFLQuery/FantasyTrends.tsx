import { useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores } from "./Fantasy";
import { allYears } from "./Fetch";

// player: (year)(traded)(consistent/died/injured)[]

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  Data(allYears).then(updateData);
  return datas === null ? null : (
    <pre>
      {JSON.stringify(
        datasToPlayerYearScores(datas.filter((d) => d.year >= 2020)).filter(
          (p) => p.name.includes("Amon")
        ),
        null,
        2
      )}
    </pre>
  );
}
