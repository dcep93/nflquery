#!/bin/bash

set -euo pipefail

# npx create-react-app app --template typescript
# npm install --save-dev ajv@^7

cd app
npm install
yarn build
rm -rf node_modules
