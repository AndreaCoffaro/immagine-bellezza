/* =========================================================================
   LOGIN DEL PANNELLO (1/2) — apre la pagina di GitHub per autorizzare l'accesso.
   Il pannello /admin apre questo indirizzo in una finestrella; GitHub poi
   rimanda a /api/callback.
   Serve una "OAuth App" su GitHub e due variabili su Vercel:
   GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET (vedi il commento in admin/config.yml).
   ========================================================================= */
const crypto = require("crypto");

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Login non configurato: manca la variabile GITHUB_CLIENT_ID nelle impostazioni del progetto su Vercel.");
    return;
  }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const scope = new URL(req.url, `https://${host}`).searchParams.get("scope") || "repo";
  // codice casuale che deve tornare uguale da GitHub: impedisce login "falsi" avviati da altri siti
  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `https://${host}/api/callback`,
    scope,
    state,
  });
  res.setHeader("Set-Cookie", `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader("Location", `https://github.com/login/oauth/authorize?${params}`);
  res.end();
};
