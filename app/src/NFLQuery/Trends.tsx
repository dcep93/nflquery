import { useMemo, useState } from "react";
import Data, { DataType } from "./Data";
import { allYears } from "./Fetch";
import { datasToPlayerYearScores } from "./PlayerYearScores";

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
    <pre>{JSON.stringify(datasToPlayerYearScores(datas), null, 2)}</pre>
  );
}
