#!/bin/bash
# FIIT Tréner – spustenie dvojklikom (Finder). Pre iPad v rovnakej Wi-Fi: ./start.command --lan
cd "$(dirname "$0")"
(sleep 1 && open "http://localhost:4173") &
exec node server.mjs "$@"
