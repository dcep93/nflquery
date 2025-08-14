import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";

import { createRef, useEffect, useState } from "react";
import { QueryBuilderName, QueryFunctions } from ".";
import { DataType } from "../Data";

export default function CustomQueryEditor(props: {
  updateHash: (hash: string) => void;
  isCustom: boolean;
  customFunctions: QueryFunctions<any>;
  datas: DataType[];
}) {
  const refs = Object.fromEntries(
    Object.keys(props.customFunctions).map((k) => [
      k,
      createRef<HTMLTextAreaElement>(),
    ])
  );
  const [formattedFunctions, updateFormattedFunctions] = useState<{
    [key: string]: string;
  } | null>(null);
  useEffect(() => {
    !formattedFunctions &&
      Promise.resolve()
        .then(() => updateFormattedFunctions(null))
        .then(() => props.customFunctions)
        .then(Object.entries)
        .then((entries) =>
          entries.map(([k, v]) =>
            Promise.resolve()
              .then(() => (props.isCustom ? v.toString() : fToString(v)))
              .then((str) => ({ k, str }))
          )
        )
        .then((ps) => Promise.all(ps))
        .then((arr) => arr.map(({ k, str }) => [k, str]))
        .then(Object.fromEntries)
        .then(updateFormattedFunctions);
  }, [formattedFunctions, props]);
  if (!formattedFunctions) return <div></div>;
  return (
    <div>
      <div>
        {Object.keys(props.customFunctions).map((k, i) => (
          <div key={i}>
            <div>{k}</div>
            <div>
              <textarea
                defaultValue={formattedFunctions[k]}
                ref={refs[k]}
                style={{ width: "42em", height: "12em" }}
              ></textarea>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button
          onClick={() =>
            Promise.resolve().then(() =>
              props.updateHash(
                `${QueryBuilderName}.${JSON.stringify(
                  Object.fromEntries(
                    Object.entries(refs).map(([k, v]) => [k, v.current!.value])
                  )
                )}`
              )
            )
          }
        >
          customize
        </button>
      </div>
    </div>
  );
}

function fToString(fn: (...args: any[]) => any): Promise<string> {
  return prettier.format(fn.toString(), {
    parser: "babel",
    plugins: [parserEstree, parserBabel],
  });
}
