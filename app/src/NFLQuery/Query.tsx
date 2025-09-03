import { useEffect, useState } from "react";
import Data, { DataType } from "./Data";
import QueryBuilder, { QueryBuilderName, QueryFunctions } from "./QueryBuilder";
import CustomQueryEditor from "./QueryBuilder/CustomQueryEditor";
import QueryHelpers from "./QueryBuilder/QueryHelpers";
import getPoints from "./QueryBuilder/getPoints";
import Comeback from "./queries/Comeback";
import Encroachments from "./queries/Encroachments";
import GamePenalties from "./queries/GamePenalties";
import Longest4thDown from "./queries/Longest4thDown";
import LongestDrive from "./queries/LongestDrive";
import March from "./queries/March";
import MinPossessionTime from "./queries/MinPossessionTime";
import OTWalkoffs from "./queries/OTWalkoffs";
import Penalty from "./queries/Penalty";
import PuntAverages from "./queries/PuntAverages";
import Q1Q3_4thDown from "./queries/Q1Q3_4thDown";
import Team4thDown from "./queries/Team4thDown";
import TeamHighScore from "./queries/TeamHighScore";
import ThirtyFourToZero from "./queries/ThirtyFourToZero";
import TotalHighScore from "./queries/TotalHighScore";
import TotalLowScore from "./queries/TotalLowScore";
import TurnoverOnDowns from "./queries/TurnoverOnDowns";
import Year4thDown from "./queries/Year4thDown";

var initialized = false;
const allQueries = {
  Encroachments,
  PuntAverages,
  Penalty,
  GamePenalties,
  Team4thDown,
  Year4thDown,
  Q1Q3_4thDown,
  MinPossessionTime,
  TeamHighScore,
  TotalHighScore,
  TotalLowScore,
  ThirtyFourToZero,
  Comeback,
  March,
  LongestDrive,
  Longest4thDown,
  TurnoverOnDowns,
  OTWalkoffs,
  [QueryBuilderName]: QueryBuilder,
};

const getQueryName = (hash: string) => hash.split(".")[0];
const getQuery = (hash: string) =>
  allQueries[getQueryName(hash) as keyof typeof allQueries];

export default function Query() {
  const [datas, updateDatas] = useState<DataType[] | null>(null);
  if (!initialized) {
    initialized = true;
    Data().then(updateDatas);
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
        .then(() =>
          getPoints(
            getQuery(hash).queryFunctions() as QueryFunctions<any>,
            datas
          )
        )
        .then((points) => ({
          num_points: points.length,
          points: points
            .slice(0, 100)
            .map((p, index) => ({ ...p, index: index + 1 })),
        }))
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
          <div style={{ ...bubbleStyle, width: "12em" }}>
            {getQuery(hash).tooltip}
          </div>
        </div>
        <div>
          <CustomQueryEditor
            key={output}
            updateHash={updateHash}
            isCustom={getQueryName(hash) === QueryBuilderName}
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
