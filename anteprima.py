#!/usr/bin/env python3
"""
ANTEPRIMA LOCALE — sito + pannello di gestione sul tuo Mac, senza pubblicare nulla.

  Sito:     http://localhost:8000
  Pannello: http://localhost:8000/admin   (pulsante "Accedi", nessuna password)

In questa modalità il pannello salva le modifiche DIRETTAMENTE nei file della
cartella del sito (content/*.json, images/uploads/). Niente va su GitHub o online
finché non lo carichi tu con GitHub Desktop. Per annullare le prove: in GitHub
Desktop, tasto destro sulle modifiche → "Discard changes".

Fa le veci di "decap-server" (il server ufficiale, che richiederebbe Node.js).
Si avvia con doppio clic su anteprima.command.
"""
import base64, json, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8000


def percorso_sicuro(rel):
    """Converte un percorso relativo del sito in assoluto, impedendo di uscire dalla cartella."""
    p = os.path.realpath(os.path.join(ROOT, str(rel).lstrip("/")))
    if p != ROOT and not p.startswith(ROOT + os.sep):
        raise ValueError(f"Percorso non consentito: {rel}")
    return p


def leggi_entry(rel):
    with open(percorso_sicuro(rel), encoding="utf-8") as f:
        return {"data": f.read(), "file": {"path": rel, "id": rel}}


def leggi_media(rel):
    with open(percorso_sicuro(rel), "rb") as f:
        contenuto = base64.b64encode(f.read()).decode()
    return {"id": rel, "content": contenuto, "encoding": "base64", "path": rel, "name": os.path.basename(rel)}


def scrivi(rel, dati):
    p = percorso_sicuro(rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(dati)
    print(f"  ✎ salvato: {rel}")


def esegui(azione, par):
    if azione == "info":
        return {"repo": os.path.basename(ROOT), "publish_modes": ["simple"], "type": "local_fs"}

    if azione == "entriesByFolder":
        cartella, ext = par["folder"], par.get("extension", "")
        base = percorso_sicuro(cartella)
        out = []
        if os.path.isdir(base):
            for nome in sorted(os.listdir(base)):
                if nome.endswith("." + ext.lstrip(".")):
                    out.append(leggi_entry(f"{cartella.rstrip('/')}/{nome}"))
        return out

    if azione == "entriesByFiles":
        return [leggi_entry(f["path"]) for f in par["files"] if os.path.exists(percorso_sicuro(f["path"]))]

    if azione == "getEntry":
        return leggi_entry(par["path"])

    if azione == "persistEntry":
        entry = par.get("entry")
        data_files = par.get("dataFiles") or ([entry] if entry else [])
        for df in data_files:
            scrivi(df["path"], df["raw"].encode("utf-8"))
        for a in par.get("assets") or []:
            scrivi(a["path"], base64.b64decode(a["content"]) if a.get("encoding") == "base64" else a["content"].encode())
        return {"message": "entry persisted"}

    if azione == "getMedia":
        cartella = par["mediaFolder"].strip("/")
        base = percorso_sicuro(cartella)
        if not os.path.isdir(base):
            return []
        return [leggi_media(f"{cartella}/{n}") for n in sorted(os.listdir(base))
                if not n.startswith(".") and os.path.isfile(os.path.join(base, n))]

    if azione == "getMediaFile":
        return leggi_media(par["path"].lstrip("/"))

    if azione == "persistMedia":
        a = par["asset"]
        rel = a["path"].lstrip("/")
        scrivi(rel, base64.b64decode(a["content"]) if a.get("encoding") == "base64" else a["content"].encode())
        return leggi_media(rel)

    if azione in ("deleteFile", "deleteFiles"):
        percorsi = par.get("paths") or [par["path"]]
        for rel in percorsi:
            p = percorso_sicuro(rel)
            if os.path.isfile(p):
                os.remove(p)
                print(f"  🗑 eliminato: {rel}")
        return {"message": "deleted"}

    if azione == "getDeployPreview":
        return None

    raise ValueError(f"Azione non supportata: {azione}")


class Gestore(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        # niente cache: le modifiche fatte dal pannello si vedono subito ricaricando il sito
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path.rstrip("/") != "/api/v1":
            self.send_error(404)
            return
        try:
            corpo = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
            risposta, codice = esegui(corpo.get("action"), corpo.get("params") or {}), 200
        except Exception as e:  # l'errore viene mostrato nel pannello
            risposta, codice = {"error": str(e)}, 500
            print(f"  ⚠ {e}")
        dati = json.dumps(risposta).encode()
        self.send_response(codice)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dati)))
        self.end_headers()
        self.wfile.write(dati)

    def log_message(self, *args):
        pass  # terminale pulito: vengono stampati solo i salvataggi


if __name__ == "__main__":
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Gestore)
    except OSError:
        sys.exit(f"La porta {PORT} è già in uso: forse l'anteprima è già aperta in un'altra finestra.")
    print(f"""
  Anteprima attiva ✔
    Sito:     http://localhost:{PORT}
    Pannello: http://localhost:{PORT}/admin   (premi «Accedi»: in prova non serve password)

  Le modifiche salvate dal pannello finiscono nei file di questa cartella.
  Per chiudere l'anteprima chiudi questa finestra.
""")
    server.serve_forever()
