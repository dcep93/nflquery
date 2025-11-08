import path from "path";
import { writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import prettier from "prettier";

import { fetchLatestYear } from "../src/NFLQuery/fetchYear";

async function main() {
  const execFileAsync = promisify(execFile);

  const globalWithFetch = globalThis as typeof globalThis & {
    fetch: typeof fetch;
  };

  globalWithFetch.fetch = (async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    if (init?.method && init.method.toUpperCase() !== "GET") {
      throw new Error(`Unsupported fetch method: ${init.method}`);
    }

    const curlArgs = ["-sSL", url];

    const headerEntries: Array<[string, string]> = [];
    const headers = init?.headers;
    if (headers) {
      if (Array.isArray(headers)) {
        headerEntries.push(...headers);
      } else if (headers instanceof Headers) {
        headers.forEach((value, key) => {
          headerEntries.push([key, value]);
        });
      } else {
        headerEntries.push(
          ...Object.entries(headers as Record<string, string>),
        );
      }
    }

    for (const [key, value] of headerEntries) {
      curlArgs.push("-H", `${key}: ${value}`);
    }

    const { stdout } = await execFileAsync("curl", curlArgs, {
      maxBuffer: 1024 * 1024 * 32,
    });

    return {
      async json() {
        return JSON.parse(stdout);
      },
      async text() {
        return stdout;
      },
    } as Response;
  }) as typeof fetch;

  const { year, games } = await fetchLatestYear();
  const payload = { year, games };
  const filePath = path.resolve(
    __dirname,
    "..",
    "..",
    "data_v6",
    `${year}.json`,
  );

  const prettierConfig = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(JSON.stringify(payload), {
    parser: "json",
    ...(prettierConfig ?? {}),
  });

  await writeFile(filePath, formatted);
  console.log(`Updated data for ${year} written to ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
