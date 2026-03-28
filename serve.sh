#!/usr/bin/env bash
# Serve Aetherbody locally for browser testing (gamepad API requires HTTP)
PORT=${1:-8080}
echo "Serving Aetherbody at http://localhost:$PORT"
echo "Press Ctrl+C to stop"
python3 -m http.server "$PORT" --bind 127.0.0.1
