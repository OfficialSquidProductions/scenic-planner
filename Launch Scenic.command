#!/bin/zsh
cd "${0:A:h}"
open http://127.0.0.1:5173
exec /usr/bin/python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
