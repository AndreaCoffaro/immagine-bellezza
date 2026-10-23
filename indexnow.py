#!/usr/bin/env python3
"""
INDEXNOW — avvisa Bing (e quindi DuckDuckGo, Copilot, ricerca di ChatGPT), Yandex e altri
motori che le pagine del sito sono nuove o cambiate. Google non usa IndexNow:
per Google si usa Search Console.

Legge gli indirizzi dalla sitemap pubblicata e li invia. Da usare dopo modifiche importanti
(nuove pagine, nuovi articoli), non a ogni piccola correzione.

Uso:  python3 indexnow.py
"""
import json, re, urllib.request

SITO = "https://www.immaginebellezzamantio.it"
CHIAVE = "a3ee9b9b6094e918c274c77165f613ce"   # il file <chiave>.txt nella cartella del sito deve contenerla

sitemap = urllib.request.urlopen(f"{SITO}/sitemap.xml", timeout=20).read().decode()
indirizzi = re.findall(r"<loc>([^<]+)</loc>", sitemap)
dati = json.dumps({"host": "www.immaginebellezzamantio.it", "key": CHIAVE,
                   "keyLocation": f"{SITO}/{CHIAVE}.txt", "urlList": indirizzi}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=dati,
                             headers={"Content-Type": "application/json; charset=utf-8"})
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        print(f"Inviati {len(indirizzi)} indirizzi: risposta {r.status} (200 o 202 = ricevuti)")
except urllib.error.HTTPError as e:
    print(f"Errore {e.code}: {e.read().decode()[:300]}")
