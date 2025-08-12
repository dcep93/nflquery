import { useEffect, useState } from "react";
import Data, { DataType } from "./Data";
import { allYears } from "./Fetch";
import QueryBuilder, { QueryBuilderName } from "./QueryBuilder";
import CustomQueryEditor from "./QueryBuilder/CustomQueryEditor";
import QueryHelpers from "./QueryBuilder/QueryHelpers";
import getPoints from "./QueryBuilder/getPoints";
import Comeback from "./queries/Comeback";

var initialized = false;
const allQueries = {
  // TotalHighScore,
  // TeamHighScore,
  // MinPossessionTime,
  // LongestDrive,
  // GamePenalties,
  // Encroachments,
  // PuntAverages,
  Comeback,
  [QueryBuilderName]: QueryBuilder,
};

const getQueryName = (hash: string) => hash.split(".")[0];
const getQuery = (hash: string) =>
  allQueries[getQueryName(hash) as keyof typeof allQueries];

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data(allYears).then(updateDatas);
    window.QueryHelpers = QueryHelpers;
  }
  const rawHash = window.location.hash.slice(1);
  const [hash, updateHash] = useState<string>(
    allQueries[rawHash.split(".")[0] as keyof typeof allQueries]
      ? rawHash
      : Object.keys(allQueries)[0]
  );
  const [output, updateOutput] = useState("NFLQuery");
  useEffect(() => {
    window.location.hash = hash;
    datas &&
      Promise.resolve()
        .then(() => getPoints(getQuery(hash).queryFunctions(), datas))
        .then((points) => points.map((p, index) => ({ ...p, index })))
        .then((o) => JSON.stringify(o, null, 2))
        .then(updateOutput)
        .catch((err) => {
          alert(err);
          console.trace(err);
        });
  }, [hash, datas]);
  if (!datas) return <div>fetching...</div>;
  return (
    <div>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>
            <select
              value={getQueryName(hash)}
              onChange={(e) =>
                updateHash((e.target as HTMLSelectElement).value)
              }
            >
              {Object.keys(allQueries).map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
          </div>
          <pre style={bubbleStyle}>{getQuery(hash).tooltip}</pre>
        </div>
        <div>
          <CustomQueryEditor
            key={output}
            updateHash={updateHash}
            customFunctions={getQuery(hash).queryFunctions()}
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

export const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

export type PointType = {
  x: number | string;
  y: number;
  label: string;
};
