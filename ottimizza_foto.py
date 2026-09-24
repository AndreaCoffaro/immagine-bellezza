#!/usr/bin/env python3
"""
OTTIMIZZA FOTO — crea copie leggere delle foto per il sito.

Le foto originali restano nelle cartelle images/ragazze, images/spa e
images/struttura (non vengono toccate). Le copie ottimizzate vengono salvate
in images/web/<cartella>/ con un nome semplice (minuscolo, senza spazi).

NOTA: una volta online non serve più. Le foto caricate dal pannello /admin
vengono ottimizzate automaticamente da Netlify. Questo script resta utile solo
per preparare foto in locale.

Uso: apri il Terminale nella cartella del sito e lancia
    python3 ottimizza_foto.py
Richiede Pillow (pip3 install Pillow) se non è già installato.
"""
import os, re, unicodedata
from PIL import Image, ImageOps

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
CARTELLE = {"ragazze": 1400, "spa": 1800, "struttura": 1600}  # lato lungo massimo in px
QUALITA = 80
ESTENSIONI = (".jpg", ".jpeg", ".png", ".webp")

def slug(nome):
    nome = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-")

def ottimizza(src, dst, lato_max):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((lato_max, lato_max), Image.LANCZOS)
        im.save(dst, "JPEG", quality=QUALITA, optimize=True, progressive=True)

def main():
    for cartella, lato_max in CARTELLE.items():
        origine = os.path.join(BASE, cartella)
        if not os.path.isdir(origine):
            continue
        destinazione = os.path.join(BASE, "web", cartella)
        os.makedirs(destinazione, exist_ok=True)
        for f in sorted(os.listdir(origine)):
            nome, ext = os.path.splitext(f)
            if ext.lower() not in ESTENSIONI:
                continue
            src = os.path.join(origine, f)
            dst = os.path.join(destinazione, slug(nome) + ".jpg")
            if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                continue
            ottimizza(src, dst, lato_max)
            print(f"{cartella}/{f}  ->  images/web/{cartella}/{os.path.basename(dst)}"
                  f"  ({os.path.getsize(src)//1024} KB -> {os.path.getsize(dst)//1024} KB)")

    # Logo: versione leggera per header, footer e icona del browser
    logo = os.path.join(BASE, "logo.png")
    if os.path.exists(logo):
        with Image.open(logo) as im:
            im = im.convert("RGBA")
            im.thumbnail((320, 320), Image.LANCZOS)
            im.save(os.path.join(BASE, "web", "logo.png"), optimize=True)
        print("logo.png  ->  images/web/logo.png")

if __name__ == "__main__":
    main()
