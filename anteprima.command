#!/bin/bash
# Doppio clic su questo file per vedere il sito sul tuo Mac (anteprima locale).
# Chiudi la finestra del Terminale per fermare l'anteprima.
cd "$(dirname "$0")"
( sleep 1 && open "http://localhost:8000" ) &
python3 -m http.server 8000
