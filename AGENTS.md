# Repository Instructions

## Updating data files in `data_v6`
- To refresh the latest season data, run from the repository root:
  `npx --yes ts-node@10.9.2 --compiler-options '{"module":"CommonJS","esModuleInterop":true,"lib":["es2021","dom"]}' --skip-project app/scripts/fetchLatestYear.ts`
- The script relies on `curl` to respect the environment proxy configuration and will write the prettified JSON into `data_v6/<year>.json`.
- Avoid running package managers that modify `app/yarn.lock` or create `app/.yarn/` artifacts; the refresh command above does not require installing additional dependencies.
