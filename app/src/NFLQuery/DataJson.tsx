import { useState } from "react";
import Data from "./Data";
import { allYears } from "./Fetch";

var initialized = false;

export default function DataJson() {
  const [state, updateState] = useState("fetching");
  if (!initialized) {
    initialized = true;
    Data(allYears).then((datas) => {
      console.log(datas);
      updateState(`console.log(${JSON.stringify(datas).length})`);
    });
  }
  return <pre>{state}</pre>;
}
