import { createRef, useState } from "react";
import { DataType } from "../Data";

const allQueryTypes = {};

export type CustomType = { name: string; functions: { [k: string]: any } };

export default function CustomQuery(props: {
  custom: CustomType;
  datas: DataType[];
}) {
  const [queryType, updateQueryType] = useState<string>(props.custom.name);
  const refs = Object.fromEntries(
    Object.entries(props.custom.functions).map(([k, v]) => [
      k,
      createRef<HTMLTextAreaElement>(),
    ])
  );
  return (
    <div>
      <select
        defaultValue={queryType}
        onChange={(e) => updateQueryType((e.target as HTMLSelectElement).value)}
      >
        {Object.keys(allQueryTypes).map((q) => (
          <option key={q}>{q}</option>
        ))}
      </select>
      <div>
        {Object.entries(props.custom.functions).map(([k, v], i) => (
          <div key={i}>
            <div>{k}</div>
            <div>
              <textarea
                defaultValue={v.toString()}
                ref={refs[k]}
                style={{ width: "42em", height: "12em" }}
              ></textarea>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button>customize</button>
      </div>
    </div>
  );
}
