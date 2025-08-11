import { createRef } from "react";
import { DataType } from "../../Data";

export type CustomType = { name: string; functions: { [k: string]: any } };

function safeEval(v: string) {
  // eslint-disable-next-line
  return eval(v);
}

export function getCustomFunctions(defaultFunctions: any) {
  try {
    const matched = window.location.hash.match(/.*?\.(.*)/);
    if (!matched) return defaultFunctions;
    const functions = JSON.parse(decodeURIComponent(matched![1]));
    const evaledFunctions = Object.fromEntries(
      Object.entries(functions).map(([k, v]) => [k, safeEval(v as string)])
    );
    return evaledFunctions;
  } catch (e) {
    alert(e);
  }
  return defaultFunctions;
}

export function CustomQueryEditor(props: {
  updateHash: (hash: string) => void;
  custom: CustomType;
  datas: DataType[];
}) {
  const refs = Object.fromEntries(
    Object.keys(props.custom.functions).map((k) => [
      k,
      createRef<HTMLTextAreaElement>(),
    ])
  );
  return (
    <div>
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
        <button
          onClick={() =>
            Promise.resolve().then(() =>
              props.updateHash(
                `${props.custom.name}.${JSON.stringify(
                  Object.fromEntries(
                    Object.entries(refs).map(([k, v]) => [k, v.current!.value])
                  )
                )}`
              )
            )
          }
        >
          customize {props.custom.name}
        </button>
      </div>
    </div>
  );
}
