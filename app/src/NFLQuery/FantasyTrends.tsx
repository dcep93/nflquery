import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { datasToPlayerYearScores } from "./Fantasy";
import { allYears } from "./Fetch";

var initialized = false;

// player: (year)(traded)(consistent/died/injured)[]

export default function Trends() {
  const [datas, updateData] = useState<DataType[] | null>(null);
  useMemo(() => {
    if (!initialized) {
      initialized = true;
      Data(allYears).then(updateData);
    }
  }, []);
  return datas === null ? null : (
    <pre>
      {JSON.stringify(
        datasToPlayerYearScores(datas.filter((d) => d.year === 2020)),
        null,
        2
      )}
    </pre>
  );
}
