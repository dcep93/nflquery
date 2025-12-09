import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import prettier from "prettier/standalone";

import { useEffect, useState } from "react";
import { evalFunctions, getCustomFunctions, QueryBuilderName } from ".";
import { DataType } from "../Data";
import { getQuery } from "../Query";

export default function CustomQueryEditor(props: {
  updateHash: (hash: string) => void;
  isCustom: boolean;
  hash: string;
  datas: DataType[];
}) {
  const customFunctions = props.isCustom
    ? getCustomFunctions(props.hash)
    : getQuery(props.hash).queryFunctions();
  const [formattedFunctions, updateFormattedFunctions] = useState<{
    [key: string]: string;
  } | null>(null);
  const [textareaValues, setTextareaValues] = useState<{
    [key: string]: string;
  }>({});
  useEffect(() => {
    if (!customFunctions) return;
    let cancelled = false;
    Promise.all(
      Object.entries(customFunctions).map(([k, v]) =>
        Promise.resolve()
          .then(() => (props.isCustom ? v.toString() : fToString(v)))
          .then((str) => [k, str] as const)
      )
    )
      .then(Object.fromEntries)
      .then((formatted) => {
        if (!cancelled) {
          updateFormattedFunctions((prev) =>
            areFormattedFunctionsEqual(prev, formatted) ? prev : formatted
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // alert(err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.hash, props.isCustom, customFunctions]);
  useEffect(() => {
    if (formattedFunctions) {
      setTextareaValues(formattedFunctions);
    }
  }, [formattedFunctions]);
  if (!formattedFunctions) return <div></div>;
  const entryKeys = customFunctions
    ? Object.keys(customFunctions)
    : ["extract", "mapPoints"];
  return (
    <div>
      <div>
        {entryKeys.map((k, i) => (
          <div key={i}>
            <div>{k}</div>
            <div>
              <textarea
                value={textareaValues[k] ?? ""}
                onChange={(event) =>
                  setTextareaValues((prev) => ({
                    ...prev,
                    [k]: event.target.value,
                  }))
                }
                style={{ width: "42em", height: "12em" }}
              ></textarea>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button
          onClick={() =>
            Promise.resolve()
              .then(() =>
                Object.fromEntries(
                  entryKeys.map((key) => [key, textareaValues[key]])
                )
              )
              .then((functions) => {
                props.updateHash(
                  `${QueryBuilderName}.${JSON.stringify(functions)}`
                );
                return functions;
              })
              .then((functions) => evalFunctions(functions) && functions)
              .catch((err) => console.error(err))
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

function areFormattedFunctionsEqual(
  a: { [key: string]: string } | null,
  b: { [key: string]: string }
): boolean {
  if (!a) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}
