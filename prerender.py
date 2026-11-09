#!/usr/bin/env python3
"""
PRE-RENDER E PAGINE — lo esegue Vercel a ogni pubblicazione (vedi vercel.json).

Il sito costruisce testi, prezzi, orari e foto con JavaScript leggendo /content.
Google lo esegue, ma in ritardo; altri motori di ricerca e gli assistenti AI spesso no.
Questo script scrive gli stessi contenuti direttamente dentro index.html, così chi
apre la pagina (o la legge un motore di ricerca) li trova già pronti. Poi js/script.js
li aggiorna come sempre.

Aggiorna anche i dati strutturati (scheda attività con orari e listino) e la sitemap,
e crea le pagine dei trattamenti (/trattamenti/...) e del blog (/blog/...) a partire da
content/trattamenti/*.json e content/blog/*.json, modificabili dal pannello.
L'anteprima locale (anteprima.py) usa questo stesso script per mostrarle.
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


def leggi_cartella(cartella):
    """Pagine di una collezione del pannello (content/<cartella>/*.json): lo slug è il nome del file."""
    base = os.path.join(ROOT, "content", cartella)
    out = []
    for nome in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if nome.endswith(".json"):
            dati = leggi(f"{cartella}/{nome[:-5]}")
            if dati:
                out.append({**dati, "slug": nome[:-5]})
    return out


C = {}
WHATSAPP = "393470096504"

def carica():
    """(Ri)legge tutti i contenuti: l'anteprima locale lo richiama a ogni richiesta."""
    global WHATSAPP
    C.clear()
    C.update({n.replace("-", "_"): leggi(n) for n in
              ["contatti", "home", "listino", "spa", "promozioni", "eventi", "regalo", "chi-siamo", "galleria", "recensioni"]})
    C["trattamenti"] = sorted([p for p in leggi_cartella("trattamenti") if p.get("pubblicata", True)],
                              key=lambda p: (p.get("ordine") or 99, p.get("nome") or ""))
    C["blog"] = sorted([p for p in leggi_cartella("blog") if p.get("pubblicato", True)],
                       key=lambda p: str(p.get("data") or ""), reverse=True)
    WHATSAPP = solo_cifre(get("contatti.whatsapp")) or "393470096504"


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
    if indirizzo:
        doc = re.sub(r'(<li data-c="indirizzo">)(.*?)(</li>)', lambda m: m.group(1) + esc(indirizzo) + m.group(3), doc)
    if k.get("email"):
        doc = doc.replace('<a href="#" data-c="email"></a>',
                          f'<a href="mailto:{esc(k["email"])}" data-c="email">{esc(k["email"])}</a>')
    for chiave in ("instagram", "facebook", "privacy", "cookie"):
        if k.get(chiave):
            doc = doc.replace(f'href="#" data-c-link="{chiave}"', f'href="{esc(k[chiave])}" data-c-link="{chiave}"')
    if k.get("partita_iva"):
        doc = doc.replace('<span data-c="piva"></span>', f'<span data-c="piva"> — P.IVA {esc(k["partita_iva"])}</span>')
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
          {link_scopri(c["categoria"])}
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
        out += f'<span class="hero-col" style="--durata:{44 + c * 8}s">{h}{copia}</span>'
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


# ---------- pagine dei trattamenti e blog ----------
PRIORITARIA = 'fetchpriority="high"'   # foto principale della pagina: si carica per prima
PIGRA = 'loading="lazy"'                # foto più in basso: si caricano quando servono

def url_trattamento(slug):
    return f"/trattamenti/{slug}/"

def url_articolo(slug):
    return f"/blog/{slug}/"

def link_scopri(categoria):
    """Link dalla scheda del listino alla pagina dedicata (se esiste)."""
    url = mappa_categorie().get(categoria)
    return f'<a class="btn btn-ghost btn-sm" href="{url}">Scopri di più {icon("arrow")}</a>' if url else ""

def mappa_categorie():
    m = {}
    for p in C.get("trattamenti", []):
        for cat in p.get("categorie_listino") or []:
            m.setdefault(cat, url_trattamento(p["slug"]))
    return m

def inline(t):
    """Grassetto **così** e link [testo](/indirizzo) dentro i testi delle pagine."""
    t = esc(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"\[([^\]]+)\]\(((?:/|https?://)[^)\s]*)\)", r'<a href="\2">\1</a>', t)

def testo_ricco(t):
    """Paragrafi separati da una riga vuota, «## » titolo, righe che iniziano con «- » elenco."""
    out = []
    for blocco in re.split(r"\n\s*\n", str(t or "").strip()):
        righe = [r.strip() for r in blocco.strip().split("\n") if r.strip()]
        if not righe:
            continue
        if righe[0].startswith("## "):
            out.append(f"<h2>{inline(righe[0][3:])}</h2>")
            righe = righe[1:]
            if not righe:
                continue
        if all(r.startswith("- ") for r in righe):
            out.append("<ul>" + "".join(f"<li>{inline(r[2:])}</li>" for r in righe) + "</ul>")
        else:
            out.append(f"<p>{inline(' '.join(righe))}</p>")
    return "\n".join(out)

def assoluti(h):
    """Le parti prese dalla home funzionano anche nelle sottocartelle."""
    h = re.sub(r'(src|href)="(images|css|js)/', r'\1="/\2/', h)
    h = re.sub(r'href="#(?!i-|main")([\w-]+)"', r'href="/#\1"', h)
    return h.replace('href="/#home"', 'href="/"')

def parti_comuni(home):
    testa = re.search(r'(<link rel="icon".*?css/style\.css">)', home, re.S).group(1)
    inizio = re.search(r"<body>\s*(.*?</header>)", home, re.S).group(1)
    piede = re.search(r'(<footer class="site">.*?)<!-- Visualizzatore foto', home, re.S).group(1)
    return assoluti(testa), assoluti(inizio), assoluti(piede)

def ld(oggetti):
    return "\n".join(f'<script type="application/ld+json">\n{json.dumps(o, ensure_ascii=False, indent=2)}\n</script>' for o in oggetti if o)

def briciole_ld(voci):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": nome, "item": SITO + url} for i, (nome, url) in enumerate(voci)]}

def briciole_html(voci):
    li = "".join(f'<li><a href="{url}">{esc(nome)}</a></li>' for nome, url in voci[:-1])
    return f'<nav class="briciole" aria-label="Sei qui"><ol>{li}<li aria-current="page">{esc(voci[-1][0])}</li></ol></nav>'

def faq_ld(faq):
    faq = [f for f in faq or [] if f.get("domanda") and f.get("risposta")]
    if not faq:
        return None
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": f["domanda"], "acceptedAnswer": {"@type": "Answer", "text": f["risposta"]}} for f in faq]}

def pulsanti(msg, chiaro=False):
    if chiaro:
        return (f'<a class="btn btn-light" data-wa="{esc(msg)}" href="{wa_link(msg)}">{icon("whatsapp")}Scrivici su WhatsApp</a>'
                f'<a class="btn btn-ghost-light" href="tel:+{solo_cifre(get("contatti.telefono")) or WHATSAPP}">{icon("phone")}Chiama ora</a>')
    return (f'<a class="btn btn-primary" data-wa="{esc(msg)}" href="{wa_link(msg)}">{icon("whatsapp")}Prenota su WhatsApp</a>'
            f'<a class="btn btn-outline" href="tel:+{solo_cifre(get("contatti.telefono")) or WHATSAPP}">{icon("phone")}Chiama ora</a>')

def cta_finale(msg):
    return f"""
  <section class="cta-finale">
    <div class="wrap">
      <h2>Prenota il tuo momento di <em>benessere</em></h2>
      <p>Scrivici su WhatsApp o chiamaci: troviamo insieme il giorno e il trattamento giusto per te. Siamo a Mussomeli, in {esc(get("contatti.indirizzo") or "centro")}.</p>
      <div class="hero-actions">{pulsanti(msg, chiaro=True)}</div>
    </div>
  </section>"""

def card(p):
    f = p.get("foto") or {}
    img = img_tag(f, 600, PIGRA) if f.get("src") else ""
    return (f'<a class="card-pagina" href="{url_trattamento(p["slug"])}">{img}'
            f'<span><strong>{esc(p.get("nome"))}</strong><small>{esc(p.get("intro"))}</small></span></a>')

def documento(testa, inizio, piede, titolo, descrizione, url, foto_src, ld_html, corpo, tipo="website"):
    og_img = SITO + "/" + foto_src.lstrip("/") if foto_src else SITO + "/images/web/spa/vasca3.jpg"
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#842C56">
<meta name="color-scheme" content="light only">
<title>{esc(titolo)}</title>
<meta name="description" content="{esc(descrizione)}">
<link rel="canonical" href="{SITO}{url}">
<meta property="og:type" content="{tipo}">
<meta property="og:title" content="{esc(titolo)}">
<meta property="og:description" content="{esc(descrizione)}">
<meta property="og:image" content="{esc(og_img)}">
<meta property="og:url" content="{SITO}{url}">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="Immagine &amp; Bellezza">
<meta name="twitter:card" content="summary_large_image">
{ld_html}
{testa}
</head>
<body class="sottopagina">
{inizio}
<main id="main" class="pagina">
{corpo}
</main>

{piede}
<script src="/js/pagina.js"></script>
<script defer src="/js/analytics.js"></script>
</body>
</html>
"""

def prezzi_html(p):
    blocchi = []
    for cat in p.get("categorie_listino") or []:
        c = next((x for x in get("listino.categorie") or [] if x.get("categoria") == cat), None)
        if not c or not c.get("servizi"):
            continue
        righe = "".join(f'<li class="servizio-riga"><span>{esc(s.get("nome"))}</span><i aria-hidden="true"></i><strong>{esc(s.get("prezzo"))}</strong></li>'
                        for s in c["servizi"])
        titolo = f"<h3>{esc(cat)}</h3>" if len(p["categorie_listino"]) > 1 else ""
        blocchi.append(f'{titolo}<ul class="servizi-lista single">{righe}</ul>')
    if p.get("prezzi_spa"):
        righe = "".join(f'<li class="servizio-riga"><span>{esc(x.get("nome"))}</span><i aria-hidden="true"></i><strong>{esc(x.get("prezzo"))}{(" " + esc(x["nota"])) if x.get("nota") else ""}</strong></li>'
                        for x in get("spa.percorsi") or [] if x.get("nome"))
        if righe:
            blocchi.append(f'<ul class="servizi-lista single">{righe}</ul>')
    if not blocchi:
        return ""
    return f"""
  <section class="pagina-prezzi" id="prezzi">
    <div class="wrap stretto">
      <h2>Prezzi</h2>
      {"".join(blocchi)}
      <p class="pagina-nota">Tutti i prezzi del centro sono nel <a href="/#servizi">listino completo</a>.</p>
    </div>
  </section>"""

def faq_html(faq):
    faq = [f for f in faq or [] if f.get("domanda") and f.get("risposta")]
    if not faq:
        return ""
    voci = "".join(f'<details><summary>{esc(f["domanda"])}</summary><p>{inline(f["risposta"])}</p></details>' for f in faq)
    return f"""
  <section class="pagina-faq">
    <div class="wrap stretto">
      <h2>Domande frequenti</h2>
      {voci}
    </div>
  </section>"""

def correlati_html(slugs, titolo="Potrebbe interessarti anche"):
    pagine = [p for s in slugs or [] for p in C["trattamenti"] if p["slug"] == s]
    if not pagine:
        return ""
    return f"""
  <section class="pagina-correlati">
    <div class="wrap">
      <h2>{esc(titolo)}</h2>
      <div class="card-pagine">{"".join(card(p) for p in pagine)}</div>
    </div>
  </section>"""

def pagina_trattamento(p, comuni):
    url = url_trattamento(p["slug"])
    voci = [("Home", "/"), ("Trattamenti", "/trattamenti/"), (p.get("nome") or p["slug"], url)]
    f = p.get("foto") or {}
    msg = p.get("messaggio_whatsapp") or f"Ciao! Vorrei informazioni su: {p.get('nome')}."
    sezioni = "\n".join(f'<h2>{esc(s.get("titolo"))}</h2>\n{testo_ricco(s.get("testo"))}' for s in p.get("sezioni") or [] if s.get("titolo") or s.get("testo"))
    offerte = []
    for cat in p.get("categorie_listino") or []:
        c = next((x for x in get("listino.categorie") or [] if x.get("categoria") == cat), {})
        for sv in c.get("servizi") or []:
            o = {"@type": "Offer", "name": sv.get("nome")}
            n = prezzo_num(sv.get("prezzo"))
            if n:
                o.update(price=n, priceCurrency="EUR")
            offerte.append(o)
    if p.get("prezzi_spa"):
        for x in get("spa.percorsi") or []:
            n = prezzo_num(x.get("prezzo"))
            if x.get("nome"):
                offerte.append({"@type": "Offer", "name": x["nome"], **({"price": n, "priceCurrency": "EUR"} if n else {})})
    servizio = {"@context": "https://schema.org", "@type": "Service", "name": p.get("h1") or p.get("nome"),
                "serviceType": p.get("nome"), "description": p.get("descrizione_seo") or p.get("intro"),
                "url": SITO + url, "areaServed": {"@type": "City", "name": "Mussomeli"},
                "provider": {"@id": SITO + "/#attivita"}}
    if f.get("src"):
        servizio["image"] = SITO + "/" + f["src"].lstrip("/")
    if offerte:
        servizio["offers"] = offerte
    foto_html = f'<figure class="pagina-foto">{img_tag(f, 1200, PRIORITARIA)}</figure>' if f.get("src") else ""
    corpo = f"""
  <section class="pagina-hero">
    <div class="wrap">
      <div class="pagina-copy">
        {briciole_html(voci)}
        <h1 class="pagina-h1"><span class="eyebrow">{esc(p.get("eyebrow") or "Mussomeli")}</span><span class="hero-title">{esc(p.get("h1") or p.get("nome"))}</span></h1>
        <p class="lead">{inline(p.get("intro"))}</p>
        <div class="hero-actions">{pulsanti(msg)}</div>
      </div>
      {foto_html}
    </div>
  </section>
  <section class="pagina-testo">
    <div class="wrap stretto testo">
{sezioni}
    </div>
  </section>{prezzi_html(p)}{faq_html(p.get("faq"))}{correlati_html(p.get("correlati"))}{cta_finale(msg)}"""
    return documento(*comuni, p.get("titolo_seo") or f"{p.get('nome')} a Mussomeli | Immagine & Bellezza",
                     p.get("descrizione_seo") or p.get("intro") or "", url, f.get("src"),
                     ld([servizio, briciole_ld(voci), faq_ld(p.get("faq"))]), corpo)

def pagina_indice_trattamenti(comuni):
    url = "/trattamenti/"
    voci = [("Home", "/"), ("Trattamenti", url)]
    corpo = f"""
  <section class="pagina-hero solo-testo">
    <div class="wrap">
      <div class="pagina-copy">
        {briciole_html(voci)}
        <h1 class="pagina-h1"><span class="eyebrow">Centro Estetico &amp; SPA · Mussomeli</span><span class="hero-title">Trattamenti estetici e SPA a Mussomeli</span></h1>
        <p class="lead">Viso, corpo, epilazione, mani e piedi, trucco e area SPA: scopri come si svolgono i nostri trattamenti, a chi sono adatti e quanto costano.</p>
        <div class="hero-actions">{pulsanti("Ciao! Vorrei prenotare un appuntamento.")}</div>
      </div>
    </div>
  </section>
  <section class="pagina-correlati">
    <div class="wrap">
      <div class="card-pagine">{"".join(card(p) for p in C["trattamenti"])}</div>
      <p class="pagina-nota centro">Cerchi un prezzo? Trovi tutto nel <a href="/#servizi">listino completo</a>.</p>
    </div>
  </section>{cta_finale("Ciao! Vorrei prenotare un appuntamento.")}"""
    lista = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "url": SITO + url_trattamento(p["slug"]), "name": p.get("nome")}
        for i, p in enumerate(C["trattamenti"])]}
    return documento(*comuni, "Trattamenti Estetici e SPA a Mussomeli | Immagine & Bellezza",
                     "Tutti i trattamenti del centro estetico Immagine & Bellezza a Mussomeli (CL): viso, corpo, epilazione laser, ceretta, manicure, trucco sposa e SPA.",
                     url, "/images/web/struttura/ingresso.jpg", ld([lista, briciole_ld(voci)]), corpo)

def data_it(d):
    mesi = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    try:
        g = datetime.date.fromisoformat(str(d)[:10])
        return f"{g.day} {mesi[g.month - 1]} {g.year}"
    except Exception:
        return ""

def pagina_articolo(a, comuni):
    url = url_articolo(a["slug"])
    voci = [("Home", "/"), ("Consigli", "/blog/"), (a.get("titolo") or a["slug"], url)]
    f = a.get("foto") or {}
    data = str(a.get("data") or "")[:10]
    articolo = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": a.get("titolo"),
                "description": a.get("descrizione_seo") or a.get("sommario"), "inLanguage": "it-IT",
                "mainEntityOfPage": SITO + url,
                "author": {"@type": "Organization", "name": "Immagine & Bellezza", "url": SITO + "/"},
                "publisher": {"@id": SITO + "/#attivita"}}
    if data:
        articolo["datePublished"] = data
        articolo["dateModified"] = str(a.get("aggiornato") or data)[:10]
    if f.get("src"):
        articolo["image"] = SITO + "/" + f["src"].lstrip("/")
    foto_html = f'<figure class="pagina-foto larga">{img_tag(f, 1400, PRIORITARIA)}</figure>' if f.get("src") else ""
    corpo = f"""
  <article>
  <section class="pagina-hero articolo">
    <div class="wrap stretto">
      {briciole_html(voci)}
      <h1 class="pagina-h1"><span class="hero-title">{esc(a.get("titolo"))}</span></h1>
      {f'<p class="pagina-data"><time datetime="{data}">{data_it(data)}</time></p>' if data else ""}
      {foto_html}
    </div>
  </section>
  <section class="pagina-testo">
    <div class="wrap stretto testo">
{testo_ricco(a.get("testo"))}
    </div>
  </section>
  </article>{correlati_html(a.get("correlati"), "I trattamenti di cui parliamo")}{cta_finale("Ciao! Vorrei prenotare un appuntamento.")}"""
    return documento(*comuni, a.get("titolo_seo") or f"{a.get('titolo')} | Immagine & Bellezza",
                     a.get("descrizione_seo") or a.get("sommario") or "", url, f.get("src"),
                     ld([articolo, briciole_ld(voci)]), corpo, tipo="article")

def pagina_indice_blog(comuni):
    url = "/blog/"
    voci = [("Home", "/"), ("Consigli", url)]
    schede = "".join(
        f'<a class="card-pagina" href="{url_articolo(a["slug"])}">'
        f'{img_tag(a["foto"], 600, PIGRA) if (a.get("foto") or {}).get("src") else ""}'
        f'<span><strong>{esc(a.get("titolo"))}</strong><small>{esc(a.get("sommario"))}</small></span></a>' for a in C["blog"])
    corpo = f"""
  <section class="pagina-hero solo-testo">
    <div class="wrap">
      <div class="pagina-copy">
        {briciole_html(voci)}
        <h1 class="pagina-h1"><span class="eyebrow">Il blog di Immagine &amp; Bellezza</span><span class="hero-title">Consigli di bellezza e benessere</span></h1>
        <p class="lead">Guide pratiche sui trattamenti, sulla SPA e sulla cura di pelle, mani e corpo, scritte dal nostro centro estetico di Mussomeli.</p>
      </div>
    </div>
  </section>
  <section class="pagina-correlati">
    <div class="wrap">
      <div class="card-pagine">{schede}</div>
    </div>
  </section>{cta_finale("Ciao! Vorrei prenotare un appuntamento.")}"""
    return documento(*comuni, "Consigli di Bellezza | Immagine & Bellezza Mussomeli",
                     "Guide pratiche su SPA, epilazione, cura del viso e del corpo dal centro estetico Immagine & Bellezza di Mussomeli (CL).",
                     url, "/images/web/spa/spa.jpg", ld([briciole_ld(voci)]), corpo)

def link_home(doc):
    """Nella home: elenco delle pagine dei trattamenti sotto il listino + mappa categorie per js/script.js."""
    if C["trattamenti"]:
        voci = "".join(f'<li><a href="{url_trattamento(p["slug"])}">{esc(p.get("nome"))}</a></li>' for p in C["trattamenti"])
        doc = sostituisci_interno(doc, "link-trattamenti",
                                  f'<p>Scopri i trattamenti nel dettaglio</p><ul>{voci}</ul>')
    mappa = json.dumps(mappa_categorie(), ensure_ascii=False).replace("</", "<\\/")
    return doc.replace('<script src="js/script.js"></script>',
                       f'<script type="application/json" id="mappa-pagine">{mappa}</script>\n<script src="js/script.js"></script>', 1)


def costruisci():
    """Restituisce {percorso del file: html} per la home e tutte le pagine generate."""
    carica()
    with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
        home = f.read()
    for passo in (testi, contatti, orari, listino, hero, bollino, dati_strutturati, link_home):
        try:
            home = passo(home)
        except Exception as e:
            print(f"[prerender] passo «{passo.__name__}» saltato: {e}")
    out = {"index.html": home}
    try:
        comuni = parti_comuni(home)
    except Exception as e:
        print(f"[prerender] pagine non generate (intestazione non trovata): {e}")
        return out
    gen = [("trattamenti/index.html", lambda: pagina_indice_trattamenti(comuni))]
    gen += [(f"trattamenti/{p['slug']}/index.html", (lambda p=p: pagina_trattamento(p, comuni))) for p in C["trattamenti"]]
    if C["blog"]:
        gen.append(("blog/index.html", lambda: pagina_indice_blog(comuni)))
        gen += [(f"blog/{a['slug']}/index.html", (lambda a=a: pagina_articolo(a, comuni))) for a in C["blog"]]
    for percorso, fn in gen:
        try:
            out[percorso] = fn()
        except Exception as e:
            print(f"[prerender] pagina {percorso} saltata: {e}")
    return out


# ---------- sitemap ----------
def data_file(rel):
    """Data dell'ultima modifica di un file secondo git (se disponibile)."""
    try:
        import subprocess
        r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel], cwd=ROOT, capture_output=True, text=True, timeout=10)
        return r.stdout.strip() or None
    except Exception:
        return None

def sitemap(percorsi):
    def immagini(fotos):
        visti, out = set(), ""
        for f in fotos:
            s = (f or {}).get("src") if isinstance(f, dict) else None
            if s and s not in visti and not re.match(r"^https?:", s):
                visti.add(s)
                out += f"\n    <image:image><image:loc>{esc(SITO + '/' + s.lstrip('/'))}</image:loc></image:image>"
        return out
    foto_home = (get("home.foto") or []) + (get("spa.foto") or []) + [get("eventi.foto") or {}] + (get("regalo.foto") or []) + (get("galleria.foto") or [])
    oggi = datetime.date.today().isoformat()
    voci = [("/", data_file("content") or oggi, immagini(foto_home))]
    if "trattamenti/index.html" in percorsi:
        voci.append(("/trattamenti/", data_file("content/trattamenti") or oggi, ""))
    for p in C["trattamenti"]:
        if f"trattamenti/{p['slug']}/index.html" in percorsi:
            voci.append((url_trattamento(p["slug"]), data_file(f"content/trattamenti/{p['slug']}.json") or oggi, immagini([p.get("foto")])))
    if "blog/index.html" in percorsi:
        voci.append(("/blog/", data_file("content/blog") or oggi, ""))
    for a in C["blog"]:
        if f"blog/{a['slug']}/index.html" in percorsi:
            voci.append((url_articolo(a["slug"]), data_file(f"content/blog/{a['slug']}.json") or oggi, immagini([a.get("foto")])))
    corpo = "".join(f"\n  <url>\n    <loc>{SITO}{u}</loc>\n    <lastmod>{d}</lastmod>{im}\n  </url>" for u, d, im in voci)
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">{corpo}\n</urlset>\n')


def main():
    file = costruisci()
    for rel, contenuto in file.items():
        p = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(contenuto)
    try:
        sitemap(file)
    except Exception as e:
        print(f"[prerender] sitemap non aggiornata: {e}")
    manifest_analytics(file)
    print(f"[prerender] pronti: {len(file)} pagine e sitemap.xml")


def manifest_analytics(percorsi):
    """Whitelist delle pagine pubbliche: l'API non accetta percorsi arbitrari."""
    pagine = sorted('/' + p.removesuffix('index.html') for p in percorsi)
    os.makedirs(os.path.join(ROOT, 'lib'), exist_ok=True)
    with open(os.path.join(ROOT, 'lib', 'analytics-pages.json'), 'w', encoding='utf-8') as f:
        json.dump(pagine, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == "__main__":
    main()
