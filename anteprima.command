#!/bin/bash
# Doppio clic su questo file per provare sul tuo Mac il sito e il pannello di gestione.
# Niente viene pubblicato. Chiudi la finestra del Terminale per fermare l'anteprima.
cd "$(dirname "$0")"
( sleep 1 && open "http://localhost:8000/admin/" && open "http://localhost:8000" ) &
python3 anteprima.py
