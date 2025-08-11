import { useState } from "react";
import Data, { DataType } from "../Data";
import { allYears } from "../Fetch";
import BestTeamGame from "./BestTeamGame";

const allQueryTypes = { BestTeamGame };

var initialized = false;

export default function CustomQuery() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data(allYears).then(updateDatas);
  }
  const [queryType, updateQueryType] = useState<string>(
    window.location.hash.slice(1).split(".")[0] || Object.keys(allQueryTypes)[0]
  );
  window.location.hash = queryType;
  if (!datas) return <div></div>;
  const Element = allQueryTypes[queryType as keyof typeof allQueryTypes];
  return (
    <div>
      <div>
        <a href="/">home</a>
      </div>
      <div>
        <div>
          <select
            defaultValue={queryType}
            onChange={(e) =>
              updateQueryType((e.target as HTMLSelectElement).value)
            }
          >
            {Object.keys(allQueryTypes).map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </div>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {<Element datas={datas} />}
        </pre>
      </div>
    </div>
  );
}
