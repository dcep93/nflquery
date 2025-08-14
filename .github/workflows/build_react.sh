#!/bin/bash

set -xeuo pipefail

# npx create-react-app app --template typescript

cd app
npm config set legacy-peer-deps true
npm install --save-dev ajv@^7
yarn install
yarn build
rm -rf node_modules
