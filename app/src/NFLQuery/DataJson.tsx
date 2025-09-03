import { useState } from "react";
import Data from "./Data";

var initialized = false;

export default function DataJson() {
  const [state, updateState] = useState("fetching");
  if (!initialized) {
    initialized = true;
    Data().then((datas) => {
      console.log(datas);
      updateState(`console.log(${JSON.stringify(datas).length})`);
    });
  }
  return <pre>{state}</pre>;
}
