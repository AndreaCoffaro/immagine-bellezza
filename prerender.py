#!/usr/bin/env python3
"""
PRE-RENDER PER GOOGLE — lo esegue Vercel a ogni pubblicazione (vedi vercel.json).

Il sito costruisce testi, prezzi, orari e foto con JavaScript leggendo /content.
Google lo esegue, ma in ritardo; altri motori di ricerca e gli assistenti AI spesso no.
Questo script scrive gli stessi contenuti direttamente dentro index.html, così chi
apre la pagina (o la legge un motore di ricerca) li trova già pronti. Poi js/script.js
li aggiorna come sempre.

Aggiorna anche i dati strutturati (scheda attività con orari e listino) e la sitemap.
Non modifica i file del progetto su GitHub: lavora solo sulla copia che viene pubblicata.
Se qualcosa va storto lascia index.html com'era (il sito funziona comunque).

Prova in locale:  python3 prerender.py --cartella /percorso/copia-del-sito
"""
import datetime, html, json, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
if "--cartella" in sys.argv:
    ROOT = os.path.abspath(sys.argv[sys.argv.index("--cartella") + 1])
SITO = "https://www.immaginebellezzamantio.it"


def leggi(nome):
    try:
        with open(os.path.join(ROOT, "content", f"{nome}.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[prerender] impossibile leggere content/{nome}.json: {e}")
        return {}


C = {n.replace("-", "_"): leggi(n) for n in
     ["contatti", "home", "listino", "spa", "promozioni", "eventi", "regalo", "chi-siamo", "galleria", "recensioni"]}


# ---------- utilità (stesse regole di js/script.js) ----------
def esc(s):
    return html.escape(str(s if s is not None else ""), quote=True).replace("&#x27;", "&#39;")

def fmt(s):
    return re.sub(r"\*(.+?)\*", r"<em>\1</em>", esc(s))

def get(path):
    o = C
    for k in path.split("."):
        o = o.get(k) if isinstance(o, dict) else None
    return o

def solo_cifre(s):
    return re.sub(r"[^\d]", "", str(s or ""))

WHATSAPP = solo_cifre(get("contatti.whatsapp")) or "393470096504"

def wa_link(msg):
    return f"https://wa.me/{WHATSAPP}?text={urllib.parse.quote(msg, safe='-_.!~*()')}"

def img_url(src, w):
    if not src:
        return ""
    if re.match(r"^https?:", src):
        return src
    return "/" + str(src).lstrip("/")

def img_tag(f, w, extra=""):
    pos = f' style="object-position:{esc(f.get("pos"))}"' if f.get("pos") else ""
    return f'<img src="{img_url(f["src"], w)}" alt="{esc(f.get("alt"))}"{pos} {extra}>'

def icon(i):
    return f'<svg class="ico" aria-hidden="true"><use href="#i-{i}"/></svg>'


def sostituisci_interno(doc, id_, contenuto):
    """Sostituisce il contenuto del primo elemento con id=... (elementi senza figli dello stesso tipo annidati)."""
    m = re.search(rf'(<(\w+)[^>]*\sid="{re.escape(id_)}"[^>]*>)(.*?)(</\2>)', doc, re.S)
    if not m:
        print(f"[prerender] elemento #{id_} non trovato")
        return doc
    return doc[:m.start(3)] + contenuto + doc[m.end(3):]


# ---------- sezioni ----------
def testi(doc):
    def rep(m):
        v = get(m.group(3))
        if isinstance(v, str) and v.strip():
            return m.group(1) + fmt(v) + m.group(5)
        return m.group(0)
    return re.sub(r'(<(\w+)[^>]*\sdata-t="([^"]+)"[^>]*>)(.*?)(</\2>)', rep, doc, flags=re.S)


GIORNI = [("lunedi", "Lunedì"), ("martedi", "Martedì"), ("mercoledi", "Mercoledì"), ("giovedi", "Giovedì"),
          ("venerdi", "Venerdì"), ("sabato", "Sabato"), ("domenica", "Domenica")]

def fasce(o):
    if not o or not o.get("aperto"):
        return []
    return [(a, c) for a, c in [(o.get("dalle"), o.get("alle")), (o.get("dalle_2"), o.get("alle_2"))] if a and c]

def orari(doc):
    o = get("contatti.orari")
    if not o:
        return doc
    gruppi = []
    for k, nome in GIORNI:
        t = " / ".join(f"{a} – {c}" for a, c in fasce(o.get(k))) or "Chiuso"
        if gruppi and gruppi[-1]["t"] == t:
            gruppi[-1]["fine"] = nome
        else:
            gruppi.append({"inizio": nome, "fine": None, "t": t})
    righe = "".join(f'<dt>{g["inizio"]}{" – " + g["fine"] if g["fine"] else ""}</dt><dd>{g["t"]}</dd>' for g in gruppi)
    return sostituisci_interno(doc, "orari-lista", righe)

def contatti(doc):
    k = C["contatti"]
    indirizzo = ", ".join(x for x in [k.get("indirizzo"), " ".join(x for x in [k.get("cap"), k.get("citta")] if x),
                                      f'({k["provincia"]})' if k.get("provincia") else ""] if x).replace(", (", " (")
    if indirizzo:
        doc = re.sub(r'(<span data-c="indirizzo">)(.*?)(</span>)', lambda m: m.group(1) + esc(indirizzo) + m.group(3), doc)
    if k.get("email"):
        doc = doc.replace('<a href="#" data-c="email"></a>',
                          f'<a href="mailto:{esc(k["email"])}" data-c="email">{esc(k["email"])}</a>')
    return doc

def listino(doc):
    categorie = [c for c in (get("listino.categorie") or []) if c.get("categoria")]
    if not categorie:
        return doc
    tabs = "".join(
        f'\n    <button class="tab" role="tab" id="tab-{i}" aria-controls="panel-servizi" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}">{esc(c["categoria"])}</button>'
        for i, c in enumerate(categorie))
    pannelli = []
    for i, c in enumerate(categorie):
        servizi = c.get("servizi") or []
        n = len(servizi)
        righe = "".join(f'<li class="servizio-riga">\n              <span>{esc(s.get("nome"))}</span><i aria-hidden="true"></i><strong>{esc(s.get("prezzo"))}</strong></li>' for s in servizi)
        # il primo pannello è quello visibile (come lo mostra js/script.js); gli altri restano nell'HTML, nascosti
        attr = 'role="tabpanel" id="panel-servizi" aria-labelledby="tab-0"' if i == 0 else f'hidden aria-labelledby="tab-{i}"'
        pannelli.append(f'''
      <div class="tab-panel" {attr}>
        <div class="intro">
          <span class="count">{n} {"trattamento" if n == 1 else "trattamenti"}</span>
          <h3>{esc(c["categoria"])}</h3>
          <p>{esc(c.get("descrizione"))}</p>
          <a class="btn btn-primary btn-sm" href="{wa_link(f"Ciao! Vorrei informazioni / prenotare: {c['categoria']}.")}" target="_blank" rel="noopener">{icon("whatsapp")}Prenota {esc(c["categoria"].lower())}</a>
        </div>
        <ul class="servizi-lista{" single" if n < 5 else ""}">
          {righe}
        </ul>
      </div>''')
    doc = sostituisci_interno(doc, "tabs-servizi", tabs)
    return sostituisci_interno(doc, "grid-servizi", "".join(pannelli))

def hero(doc):
    foto = [f for f in (get("home.foto") or []) if f.get("src")]
    if not foto:
        return doc
    while len(foto) < 6:
        foto = foto + foto
    colonne = [[], [], []]
    for k, f in enumerate(foto):
        colonne[k % 3].append(f)
    out = ""
    for c, col in enumerate(colonne):
        h = "".join(img_tag(f, 500, 'fetchpriority="high"' if c == 0 and k == 0 else 'loading="lazy"') for k, f in enumerate(col))
        copia = h.replace("<img ", '<img aria-hidden="true" ')
        out += f'<div class="hero-col" style="--durata:{44 + c * 8}s">{h}{copia}</div>'
    doc = sostituisci_interno(doc, "hero-arch", out)
    return doc.replace('id="hero-arch"', 'id="hero-arch" data-pronto', 1)

def bollino(doc):
    testi_b = [str(t).strip() for t in (get("home.bollino_testi") or []) if str(t or "").strip()]
    if testi_b:
        doc = re.sub(r'(<div class="hero-card" id="hero-card"><strong>)(.*?)(</strong>)',
                     lambda m: m.group(1) + esc(testi_b[0]) + m.group(3), doc)
    return doc


# ---------- dati strutturati ----------
def prezzo_num(p):
    m = re.fullmatch(r"\s*€?\s*(\d+(?:[.,]\d{1,2})?)\s*€?\s*", str(p or ""))
    return m.group(1).replace(",", ".") if m else None

def dati_strutturati(doc):
    m = re.search(r'(<script type="application/ld\+json" id="ld-attivita">)(.*?)(</script>)', doc, re.S)
    if not m:
        return doc
    try:
        ld = json.loads(m.group(2))
    except Exception:
        return doc
    k = C["contatti"]
    giorni_en = dict(lunedi="Monday", martedi="Tuesday", mercoledi="Wednesday", giovedi="Thursday",
                     venerdi="Friday", sabato="Saturday", domenica="Sunday")
    ore = [{"@type": "OpeningHoursSpecification", "dayOfWeek": giorni_en[g], "opens": a, "closes": c}
           for g, _ in GIORNI for a, c in fasce((k.get("orari") or {}).get(g))]
    if ore:
        ld["openingHoursSpecification"] = ore
    if k.get("telefono"):
        ld["telephone"] = k["telefono"]
    if k.get("email"):
        ld["email"] = k["email"]
    ld["address"] = {"@type": "PostalAddress", "streetAddress": k.get("indirizzo") or None, "addressLocality": k.get("citta"),
                     "addressRegion": k.get("provincia"), "postalCode": k.get("cap"), "addressCountry": "IT"}
    ld["address"] = {a: b for a, b in ld["address"].items() if b}
    social = [x for x in [k.get("instagram"), k.get("facebook")] if x]
    if social:
        ld["sameAs"] = social
    if k.get("partita_iva"):
        ld["vatID"] = k["partita_iva"]
    # listino come catalogo di servizi
    cat = []
    for c in get("listino.categorie") or []:
        offerte = []
        for s in c.get("servizi") or []:
            if not s.get("nome"):
                continue
            o = {"@type": "Offer", "itemOffered": {"@type": "Service", "name": s["nome"]}}
            p = prezzo_num(s.get("prezzo"))
            if p:
                o.update(price=p, priceCurrency="EUR")
            offerte.append(o)
        if offerte:
            cat.append({"@type": "OfferCatalog", "name": c["categoria"], "itemListElement": offerte})
    for p in get("spa.percorsi") or []:
        if p.get("nome"):
            o = {"@type": "Offer", "itemOffered": {"@type": "Service", "name": p["nome"], "description": p.get("descrizione") or None}}
            o["itemOffered"] = {a: b for a, b in o["itemOffered"].items() if b}
            n = prezzo_num(p.get("prezzo"))
            if n:
                o.update(price=n, priceCurrency="EUR")
            spa = next((x for x in cat if x.get("name") == "Area SPA"), None)
            if not spa:
                spa = {"@type": "OfferCatalog", "name": "Area SPA", "itemListElement": []}
                cat.append(spa)
            spa["itemListElement"].append(o)
    if cat:
        ld["hasOfferCatalog"] = {"@type": "OfferCatalog", "name": "Listino prezzi", "itemListElement": cat}
    nuovo = json.dumps(ld, ensure_ascii=False, indent=2)
    return doc[:m.start(2)] + "\n" + nuovo + "\n" + doc[m.end(2):]


# ---------- sitemap ----------
def sitemap():
    foto = []
    for f in (get("home.foto") or []) + (get("spa.foto") or []) + [get("eventi.foto") or {}] + (get("regalo.foto") or []):
        if isinstance(f, dict) and f.get("src") and f["src"] not in foto:
            foto.append(f["src"])
    for z in (get("galleria.zone") or get("galleria.foto") or []):
        for f in (z.get("foto") if isinstance(z, dict) and isinstance(z.get("foto"), list) else [z]):
            if isinstance(f, dict) and f.get("src") and f["src"] not in foto:
                foto.append(f["src"])
    immagini = "".join(f"\n    <image:image><image:loc>{esc(SITO + '/' + s.lstrip('/'))}</image:loc></image:image>"
                       for s in foto if not re.match(r"^https?:", s))
    oggi = datetime.date.today().isoformat()
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>{SITO}/</loc>
    <lastmod>{oggi}</lastmod>{immagini}
  </url>
</urlset>
''')


def main():
    percorso = os.path.join(ROOT, "index.html")
    with open(percorso, encoding="utf-8") as f:
        doc = f.read()
    for passo in (testi, contatti, orari, listino, hero, bollino, dati_strutturati):
        try:
            doc = passo(doc)
        except Exception as e:
            print(f"[prerender] passo «{passo.__name__}» saltato: {e}")
    with open(percorso, "w", encoding="utf-8") as f:
        f.write(doc)
    try:
        sitemap()
    except Exception as e:
        print(f"[prerender] sitemap non aggiornata: {e}")
    print("[prerender] index.html e sitemap.xml pronti")


if __name__ == "__main__":
    main()
