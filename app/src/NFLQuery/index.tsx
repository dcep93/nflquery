import { BrowserRouter, Route, Routes } from "react-router-dom";
import DataJson from "./DataJson";
import Fantasy from "./Fantasy";
import Fetch from "./Fetch";
import InjuryTrends from "./InjuryTrends";
import Query from "./Query";
import recorded_sha from "./recorded_sha";

console.log(recorded_sha);

export default function NFLQuery() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/fantasy"} element={<Fantasy />} />
        <Route path={"/injuryTrends"} element={<InjuryTrends />} />
        <Route path={"/json"} element={<DataJson />} />
        <Route path={"/fetch"} element={<Fetch />} />
        <Route path={"/query"} element={<Query />} />
        <Route index element={<Query />} />
      </Routes>
    </BrowserRouter>
  );
}
