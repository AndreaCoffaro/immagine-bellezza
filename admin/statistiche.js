// Decap conserva l'utente autenticato in decap-cms-user (LocalStorageAuthStore).
// Il token esistente viene usato solo verso l'API del sito, che verifica i permessi su GitHub.
(() => {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const button = document.createElement('button');
  button.id = 'open-stats';
  button.textContent = 'Statistiche del sito';
  button.hidden = true;
  const dialog = document.createElement('dialog');
  dialog.id = 'site-stats';
  dialog.setAttribute('aria-labelledby', 'stats-title');
  dialog.innerHTML = `
    <header><div><small>Immagine &amp; Bellezza</small><h1 id="stats-title">Statistiche del sito</h1></div><button type="button" id="close-stats">Torna ai contenuti</button></header>
    <div class="stats-controls"><label>Periodo <select id="stats-days"><option value="7">Ultimi 7 giorni</option><option value="30" selected>Ultimi 30 giorni</option><option value="90">Ultimi 90 giorni</option></select></label><button type="button" id="refresh-stats">Aggiorna</button></div>
    <p id="stats-status" role="status" aria-live="polite"></p>
    <div id="stats-results" hidden>
      <div class="stats-cards"><article><h2>Visualizzazioni</h2><strong id="stats-views"></strong></article><article><h2>Clic WhatsApp</h2><strong id="stats-whatsapp"></strong></article><article><h2>Clic telefono</h2><strong id="stats-phone"></strong></article><article><h2>Clic email</h2><strong id="stats-email"></strong></article></div>
      <section><h2>Visualizzazioni giorno per giorno</h2><div id="stats-chart" aria-hidden="true"></div><details><summary>Leggi i dati giornalieri</summary><div class="stats-scroll"><table><thead><tr><th scope="col">Giorno</th><th scope="col">Visualizzazioni</th></tr></thead><tbody id="stats-daily"></tbody></table></div></details></section>
      <div class="stats-tables"><section><h2>Pagine più viste</h2><table><thead><tr><th scope="col">Pagina</th><th scope="col">Visualizzazioni</th></tr></thead><tbody id="stats-pages"></tbody></table></section><section><h2>Provenienza</h2><table><thead><tr><th scope="col">Origine</th><th scope="col">Visualizzazioni</th></tr></thead><tbody id="stats-sources"></tbody></table></section><section><h2>Dispositivi</h2><table><thead><tr><th scope="col">Tipo</th><th scope="col">Visualizzazioni</th></tr></thead><tbody id="stats-devices"></tbody></table></section></div>
    </div>
    <footer>Le visualizzazioni contano le aperture delle pagine, comprese le visite ripetute: non sono persone uniche. I clic sui contatti non confermano una prenotazione. Date e giorni nel fuso orario di Roma. Dati disponibili dall’attivazione, conservati per 100 giorni. Esclusi i bot riconosciuti, chi richiede di non essere tracciato e i browser con accesso admin salvato.</footer>`;
  document.body.append(button, dialog);
  const $ = id => dialog.querySelector(`#${id}`);
  const format = n => Number(n).toLocaleString('it-IT');
  const date = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  let active = null;
  let lastToken = '';
  function token() {
    try { return JSON.parse(localStorage.getItem('decap-cms-user') || 'null')?.token || ''; }
    catch (_) { return ''; }
  }
  function rows(id, entries) {
    const tbody = $(id);
    tbody.replaceChildren();
    if (!entries.length) entries = [['Nessun dato nel periodo', 0]];
    for (const [name, count] of entries) {
      const tr = document.createElement('tr');
      for (const value of [name, format(count)]) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      tbody.append(tr);
    }
  }
  function clear() {
    $('stats-results').hidden = true;
    for (const id of ['views', 'whatsapp', 'phone', 'email', 'chart', 'daily', 'pages', 'sources', 'devices']) $('stats-' + id).replaceChildren();
  }
  async function load() {
    active?.abort();
    const controller = new AbortController();
    active = controller;
    clear();
    $('stats-status').textContent = 'Caricamento delle statistiche…';
    if (local) {
      $('stats-status').textContent = 'L’anteprima locale non raccoglie accessi. Le statistiche reali saranno disponibili sul sito Vercel dopo aver collegato Redis: vedi STATISTICHE.md nella cartella del sito.';
      return;
    }
    try {
      const currentToken = token();
      if (!currentToken) throw new Error('Accedi al pannello con GitHub per consultare le statistiche.');
      const response = await fetch(`/api/analytics?days=${$('stats-days').value}`, {
        headers: { Authorization: `Bearer ${currentToken}` }, cache: 'no-store', signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossibile caricare le statistiche.');
      if (token() !== currentToken || !dialog.open) return;
      $('stats-views').textContent = format(data.totals.view);
      for (const event of ['whatsapp', 'phone', 'email']) $('stats-' + event).textContent = format(data.totals[event]);
      rows('stats-daily', data.daily.map(d => [date(d.date), d.views]));
      for (const group of ['pages', 'sources', 'devices']) rows('stats-' + group, Object.entries(data[group]).sort((a, b) => b[1] - a[1]));
      const max = Math.max(1, ...data.daily.map(d => d.views));
      $('stats-chart').replaceChildren();
      for (const d of data.daily) {
        const bar = document.createElement('div');
        bar.className = 'stats-bar';
        bar.style.height = `${Math.max(d.views ? 2 : 0, d.views / max * 100)}%`;
        bar.title = `${date(d.date)}: ${format(d.views)}`;
        $('stats-chart').append(bar);
      }
      $('stats-results').hidden = false;
      $('stats-status').textContent = data.totals.view
        ? `Dal ${date(data.daily[0].date)} al ${date(data.daily.at(-1).date)} · aggiornato alle ${new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' })}`
        : 'Nessuna visualizzazione registrata in questo periodo. I dati iniziano dall’attivazione della raccolta.';
    } catch (error) {
      if (error.name !== 'AbortError') $('stats-status').textContent = error.message;
    }
  }
  function sync() {
    const current = token();
    button.hidden = !local && !current;
    if (lastToken !== current && dialog.open) { active?.abort(); dialog.close(); clear(); }
    lastToken = current;
  }
  button.addEventListener('click', () => { dialog.showModal(); load(); });
  $('close-stats').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { active?.abort(); clear(); });
  $('refresh-stats').addEventListener('click', load);
  $('stats-days').addEventListener('change', load);
  window.addEventListener('storage', sync);
  setInterval(sync, 1000);
  sync();
})();
