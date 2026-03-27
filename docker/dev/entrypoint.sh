#!/bin/bash

set -e

if [ ! -d node_modules ]; then
  npm install
fi

npm run start:dev -- -b swc