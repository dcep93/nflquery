import { useState } from "react";
import { allYears, endYear } from "./constants";
import { fetchYear } from "./fetchYear";
import { GameType } from "./types";

// https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c

var initialized = false;

export default function Fetch() {
  const [state, update] = useState({
    startedJobs: 0,
    endedJobs: 0,
    startedYears: 0,
    endedYears: 0,
    // startedTickets: 0,
    // endedTickets: 0,
  });
  if (!initialized) {
    initialized = true;
    Promise.resolve()
      .then(() => update({ ...state, startedJobs: ++state.startedJobs }))
      .then(() =>
        allYears
          .filter((year) => year === endYear)
          .map((year, yearIndex) =>
            Promise.resolve()
              .then(
                () =>
                  new Promise((resolve) =>
                    setTimeout(resolve, 1000 * yearIndex)
                  )
              )
              .then(() =>
                update({ ...state, startedYears: ++state.startedYears })
              )
              .then(() => fetchYear(year))
              .then((games: GameType[]) => ({
                year,
                games,
              }))
              .then((data) =>
                Promise.resolve()
                  .then(() =>
                    update({ ...state, endedYears: ++state.endedYears })
                  )
                  .then(() => data)
              )
          )
      )
      .then((ps) => Promise.all(ps))
      .then((ds) => ds.map((d) => console.log(d)))
      .then(() => update({ ...state, endedJobs: ++state.endedJobs }));
  }
  return <pre>{JSON.stringify(state)}</pre>;
}
