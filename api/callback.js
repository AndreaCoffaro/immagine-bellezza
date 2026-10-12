/* =========================================================================
   LOGIN DEL PANNELLO (2/2) — GitHub torna qui dopo l'autorizzazione.
   Scambia il codice ricevuto con un token e lo passa al pannello /admin
   (che ha aperto questa finestrella), poi la finestrella si chiude da sola.
   ========================================================================= */
const pagina = (stato, contenuto) => {
  // il messaggio viaggia dentro uno <script>: niente "<" letterali
  const messaggio = JSON.stringify(`authorization:github:${stato}:${JSON.stringify(contenuto)}`).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Accesso al pannello</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:40px">
<p>${stato === "success" ? "Accesso riuscito, un attimo…" : "Accesso non riuscito. Chiudi questa finestra e riprova."}</p>
<script>
(function () {
  var messaggio = ${messaggio};
  if (!window.opener) return;
  // il pannello risponde a "authorizing:github" indicando il suo indirizzo: solo a quello mandiamo il token
  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    window.opener.postMessage(messaggio, e.origin);
    ${stato === "success" ? "setTimeout(function () { window.close(); }, 300);" : ""}
  }, false);
  window.opener.postMessage("authorizing:github", window.location.origin);
})();
</script>
</body></html>`;
};

const leggiCookie = (req, nome) => {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`));
  return m ? m[1] : null;
};

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = new URL(req.url, `https://${host}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const fallisci = msg => { res.statusCode = 400; res.end(pagina("error", { message: msg })); };

  if (!code) return fallisci("Codice di GitHub mancante.");
  if (!state || state !== leggiCookie(req, "decap_oauth_state")) return fallisci("Richiesta non valida o scaduta: riprova.");
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return fallisci("Login non configurato: mancano GITHUB_CLIENT_ID o GITHUB_CLIENT_SECRET su Vercel.");
  }

  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `https://${host}/api/callback`,
      }),
    });
    const dati = await r.json();
    if (!dati.access_token) return fallisci(dati.error_description || "GitHub non ha concesso l'accesso.");
    res.setHeader("Set-Cookie", "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    res.statusCode = 200;
    res.end(pagina("success", { token: dati.access_token, provider: "github" }));
  } catch (e) {
    fallisci("Errore di collegamento con GitHub: riprova tra poco.");
  }
};
