#!/bin/bash

set -xeuo pipefail

# npx create-react-app app --template typescript

cd app
yarn install
yarn build
rm -rf node_modules
