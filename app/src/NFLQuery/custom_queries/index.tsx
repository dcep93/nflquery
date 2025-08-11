import { useState } from "react";
import BestTeamGame from "./BestTeamGame";

const allQueryTypes = { BestTeamGame };

export default function CustomQuery() {
  const [queryType, updateQueryType] = useState<string>(
    window.location.hash.slice(1) || Object.keys(allQueryTypes)[0]
  );
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
        <pre style={{ whiteSpace: "pre-wrap" }}>{<Element />}</pre>
      </div>
    </div>
  );
}
