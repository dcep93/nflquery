import { BrowserRouter, Route, Routes } from "react-router-dom";
import Fetch from "./Fetch";
import Query from "./Query";

export default function NFLQuery() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/fetch"} element={<Fetch />} />
        <Route path={"/query"} element={<Query />} />
        <Route index element={<Query />} />
      </Routes>
    </BrowserRouter>
  );
}
