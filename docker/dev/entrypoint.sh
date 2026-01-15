#!/bin/bash

set -e

# Install dependencies only when needed:
# - if node_modules does not exist, or
# - if package-lock.json is newer than node_modules (dependencies changed).
if [ ! -d node_modules ]; then
  npm install
elif [ -f package-lock.json ] && [ package-lock.json -nt node_modules ]; then
  npm install
fi

npm run start:dev -- -b swc