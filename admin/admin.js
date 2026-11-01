// Una home semplice sopra Decap: il CMS resta responsabile di login, editor e salvataggi.
(() => {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    chart: '<path d="M4 3v17h17M9 15v-4m5 4V7m5 8v-4"/>',
    book: '<path d="M12 5v16M3 4h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
    tag: '<path d="m3 3 8 .1L22 14 14 22 3.1 11z"/><circle cx="7.5" cy="7.5" r="1"/>',
    leaf: '<path d="M5 19c-7-9 3-15 15-15 0 12-6 22-15 15Zm0 0 10-10M3 21l2-2"/>',
    photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13m0-13C4 9 4 2 8 3c3 0 4 5 4 5s1-5 4-5c4-1 4 6-4 5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.edit}</svg>`;
  const sections = [
    ['listino', 'Listino e prezzi', 'Aggiorna trattamenti, categorie e prezzi.', 'tag', 'offerta', 'prezzi servizi costo'],
    ['spa', 'Area SPA', 'Percorsi, prezzi e foto del tuo spazio relax.', 'leaf', 'offerta', 'sauna idromassaggio benessere'],
    ['promozioni', 'Promozioni', 'Crea e aggiorna le offerte del momento.', 'gift', 'offerta', 'sconti offerte'],
    ['home', 'Pagina iniziale', 'Titoli, foto e messaggio di benvenuto.', 'home', 'contenuti', 'homepage copertina carosello'],
    ['galleria', 'Foto e ambienti', 'Galleria, apparecchiature e prodotti del centro.', 'photo', 'contenuti', 'immagini tecnologie macchinari'],
    ['contatti', 'Contatti e orari', 'Telefono, indirizzo, social e giorni di apertura.', 'pin', 'contenuti', 'whatsapp email mappa privacy cookie facebook instagram'],
    ['eventi', 'Feste ed eventi', 'Occasioni speciali, feste e aperitivi in SPA.', 'calendar', 'offerta', 'compleanno addio nubilato'],
    ['regalo', 'Buoni regalo', 'Testi e foto per regalare un momento di benessere.', 'gift', 'offerta', 'voucher gift card'],
    ['chi-siamo', 'Chi siamo', 'Presentazione, firma e foto della titolare.', 'heart', 'contenuti', 'maria rita team storia'],
    ['recensioni', 'Recensioni', 'Le esperienze e i commenti delle clienti.', 'star', 'contenuti', 'stelle opinioni google'],
    ['trattamenti', 'Pagine dei trattamenti', 'Crea e modifica le pagine dei singoli servizi.', 'edit', 'pagine', 'laser epilazione ceretta manicure pedicure trucco sposa viso corpo'],
    ['blog', 'Blog e consigli', 'Scrivi articoli e pubblica consigli di bellezza.', 'book', 'pagine', 'articoli notizie post'],
  ];
  const panel = document.createElement('div');
  panel.id = 'admin-dashboard';
  panel.hidden = true;
  panel.innerHTML = `
    <a class="admin-skip" href="#admin-content">Vai ai contenuti</a>
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/" target="_blank" rel="noopener"><img src="/images/web/logo.png" alt="" width="44" height="44"><span>Immagine &amp; Bellezza<small>IL TUO PANNELLO</small></span></a>
      <span class="admin-nav-label">IL TUO SITO</span>
      <nav aria-label="Pannello di gestione">
        <button type="button" class="admin-nav active" data-home aria-current="page">${icon('grid')}Panoramica</button>
        <button type="button" class="admin-nav" data-contents>${icon('edit')}Modifica contenuti</button>
        <button type="button" class="admin-nav" data-stats>${icon('chart')}Statistiche</button>
        <button type="button" class="admin-nav" data-guide>${icon('book')}Guida rapida</button>
      </nav>
      <div class="admin-sidebar-note"><span class="admin-note-symbol">✧</span><strong>Un piccolo aggiornamento,<br>un sito sempre curato.</strong><p>Prezzi, foto e novità: bastano pochi minuti.</p></div>
      <a class="admin-site-link" href="/" target="_blank" rel="noopener">Visita il sito <span aria-hidden="true">↗</span></a>
    </aside>
    <div class="admin-workspace">
      <header class="admin-topbar"><span>Gestione del sito <span class="admin-divider">/</span> <strong>Panoramica</strong></span><span class="admin-environment">${local ? 'Anteprima locale' : 'Area riservata'}</span></header>
      <main id="admin-content" tabindex="-1">
        <div class="admin-heading"><div><p class="admin-eyebrow">IL TUO CENTRO, ANCHE ONLINE</p><h1>Prenditi cura del tuo sito.</h1><p>Da qui puoi aggiornare ogni dettaglio, con semplicità.</p></div><time id="admin-date"></time></div>
        <section class="admin-quick" aria-labelledby="admin-quick-title"><div><span class="admin-eyebrow">DA DOVE COMINCIAMO?</span><h2 id="admin-quick-title">Le cose di tutti i giorni</h2></div><div class="admin-quick-grid">
          <a class="admin-quick-card" href="#/collections/sito/entries/listino" data-edit="listino"><span class="admin-icon">${icon('tag')}</span><strong>Aggiorna i prezzi</strong><span>Apri il listino trattamenti</span>${icon('arrow')}</a>
          <a class="admin-quick-card" href="#/collections/sito/entries/promozioni" data-edit="promozioni"><span class="admin-icon">${icon('gift')}</span><strong>Prepara un’offerta</strong><span>Gestisci le promozioni</span>${icon('arrow')}</a>
          <button type="button" class="admin-quick-card admin-quick-stats" data-stats><span class="admin-icon">${icon('chart')}</span><strong>Come va il sito?</strong><span>Consulta accessi e statistiche</span>${icon('arrow')}</button>
        </div></section>
        <section class="admin-library" aria-labelledby="admin-library-title"><div class="admin-section-heading"><div><h2 id="admin-library-title">Cosa vuoi modificare?</h2><p>Scegli una sezione per aprire le sue impostazioni.</p></div><label class="admin-search">${icon('search')}<span class="admin-sr-only">Cerca una sezione</span><input id="admin-search" type="search" placeholder="Cerca prezzi, foto, orari…" autocomplete="off"></label></div>
          <div class="admin-filters" role="group" aria-label="Filtra le sezioni"><button type="button" data-filter="all" aria-pressed="true">Tutte le sezioni</button><button type="button" data-filter="offerta" aria-pressed="false">Servizi e offerte</button><button type="button" data-filter="contenuti" aria-pressed="false">Il centro</button><button type="button" data-filter="pagine" aria-pressed="false">Pagine e blog</button></div>
          <p class="admin-sr-only" id="admin-search-count" role="status"></p><div class="admin-section-grid" id="admin-sections"></div>
          <div id="admin-empty" hidden><strong>Nessuna sezione trovata</strong><p>Prova con “prezzi”, “foto” o “contatti”.</p><button type="button" id="admin-reset-search">Mostra tutte le sezioni</button></div>
        </section>
        <section class="admin-publish-tip"><span class="admin-icon">${icon('leaf')}</span><div><h2>Hai finito le modifiche?</h2><p>Nell’editor scegli <strong>Pubblica → Pubblica ora</strong>. Poi apri il sito per controllare il risultato. L’aggiornamento può richiedere circa un minuto.</p></div><button type="button" data-guide>Come funziona ${icon('arrow')}</button></section>
        <footer class="admin-footer"><span>Immagine &amp; Bellezza · Il tuo spazio di gestione</span><button type="button" id="admin-open-editor">Pannello completo e account ${icon('arrow')}</button></footer>
      </main>
    </div>`;
  const toolbar = document.createElement('nav');
  toolbar.id = 'admin-editor-tools';
  toolbar.setAttribute('aria-label', 'Scorciatoie di gestione');
  toolbar.hidden = true;
  toolbar.innerHTML = `<button type="button" data-home>${icon('grid')}Panoramica</button><button type="button" data-stats>${icon('chart')}Statistiche</button><button type="button" data-guide>${icon('book')}Guida</button><a href="/" target="_blank" rel="noopener">Visita il sito ↗</a>`;
  const guide = document.createElement('dialog');
  guide.id = 'admin-guide';
  guide.setAttribute('aria-labelledby', 'admin-guide-title');
  guide.innerHTML = `<div class="admin-guide-header"><span class="admin-eyebrow">POCHI PASSI, TUTTO QUI</span><button type="button" id="admin-close-guide" aria-label="Chiudi la guida">✕</button></div><h1 id="admin-guide-title">Aggiorna il sito, con calma.</h1><p>Scegli cosa cambiare. Al resto pensa il pannello.</p><ol><li><strong>Scegli la sezione</strong><p>Usa le schede nella panoramica. Per orari e telefono, ad esempio, apri “Contatti e orari”.</p></li><li><strong>Modifica i contenuti</strong><p>Cambia testi e prezzi. Per le foto scegli un’immagine dal computer. Nelle liste puoi aggiungere, rimuovere e riordinare gli elementi.</p></li><li><strong>Pubblica le modifiche</strong><p>In alto nell’editor scegli “Pubblica”, poi “Pubblica ora”. Se un campo obbligatorio manca, il pannello ti indica cosa completare.</p></li><li><strong>Controlla il risultato</strong><p>Apri “Visita il sito”. Attendi circa un minuto e ricarica la pagina per vedere gli aggiornamenti.</p></li></ol><details><summary>Un suggerimento per foto e testi</summary><p>Scegli foto nitide e compila la descrizione dell’immagine. Nei titoli che lo prevedono, scrivi *una parola* tra asterischi per evidenziarla in corsivo.</p></details><details><summary>Come funzionano le statistiche?</summary><p>Mostrano aperture delle pagine e clic sui contatti, per 7, 30 o 90 giorni. Non contano persone uniche. I dati iniziano dall’attivazione dell’archivio delle statistiche.</p></details><p class="admin-guide-note">${local ? 'Stai usando l’anteprima locale: i salvataggi modificano i file sul Mac. Per andare online serve il caricamento su GitHub.' : 'Le modifiche ai contenuti vengono pubblicate dal pannello: non serve aprire GitHub Desktop.'}</p>`;
  document.body.append(panel, toolbar, guide);
  const $ = id => document.getElementById(id);
  const cards = [];
  for (const [slug, title, description, symbol, category, keywords] of sections) {
    const a = document.createElement('a');
    a.className = 'admin-section-card';
    a.href = `#/collections/${['trattamenti', 'blog'].includes(slug) ? slug : 'sito/entries/' + slug}`;
    a.dataset.edit = slug;
    a.innerHTML = `<span class="admin-icon">${icon(symbol)}</span><span class="admin-card-copy"><strong>${title}</strong><span>${description}</span></span><span class="admin-card-arrow">${icon('arrow')}</span>`;
    $('admin-sections').append(a);
    cards.push({ element: a, category, text: normalize(`${title} ${description} ${keywords}`) });
  }
  $('admin-date').textContent = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('admin-date').dateTime = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
  let filter = 'all';
  function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function search() {
    const words = normalize($('admin-search').value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      card.element.hidden = !((filter === 'all' || filter === card.category) && words.every(word => card.text.includes(word)));
      if (!card.element.hidden) count++;
    }
    $('admin-empty').hidden = count > 0;
    $('admin-search-count').textContent = `${count} sezioni trovate`;
  }
  $('admin-search').addEventListener('input', search);
  panel.querySelector('.admin-skip').addEventListener('click', e => {
    e.preventDefault();
    $('admin-content').focus();
  });
  panel.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    panel.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    search();
  }));
  $('admin-reset-search').addEventListener('click', () => {
    $('admin-search').value = '';
    panel.querySelector('[data-filter="all"]').click();
    $('admin-search').focus();
  });
  function user() {
    try { return JSON.parse(localStorage.getItem('decap-cms-user') || 'null'); } catch (_) { return null; }
  }
  function authenticated() {
    if (user()?.token) return true;
    // Il backend locale non ha token: le raccolte diventano visibili dopo “Accedi”.
    return local && !!document.querySelector('#nc-root a[href*="/collections/"]');
  }
  function show(home, focus = false) {
    if (!authenticated()) return;
    panel.hidden = !home;
    toolbar.hidden = home;
    document.body.dataset.adminView = home ? 'home' : 'editor';
    const cms = $('nc-root');
    if (cms) { cms.inert = home; cms.setAttribute('aria-hidden', String(home)); }
    if (focus && home) { panel.scrollTop = 0; $('admin-content').focus({ preventScroll: true }); }
    if (focus && !home) toolbar.querySelector('button').focus();
  }
  document.addEventListener('click', e => {
    const action = e.target.closest?.('[data-home], [data-contents], [data-stats], [data-guide], [data-edit]');
    if (!action) return;
    if (action.hasAttribute('data-home')) show(true, true);
    if (action.hasAttribute('data-contents')) { $('admin-library-title').scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); $('admin-search').focus({ preventScroll: true }); }
    if (action.hasAttribute('data-stats')) $('open-stats')?.click();
    if (action.hasAttribute('data-guide')) guide.showModal();
    // Lascia al router Decap la protezione delle modifiche non salvate.
    if (action.hasAttribute('data-edit') && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) show(false, true);
  });
  $('admin-open-editor').addEventListener('click', () => show(false, true));
  $('admin-close-guide').addEventListener('click', () => guide.close());
  let signedIn = false;
  function sync() {
    const next = authenticated();
    if (next !== signedIn) {
      signedIn = next;
      $('admin-welcome').hidden = next;
      if (next) {
        // Un link diretto a un contenuto continua ad aprire quel contenuto.
        show(!/\/collections\/[^/]+\/(entries|new)(\/|$)/.test(location.hash));
      } else {
        panel.hidden = toolbar.hidden = true;
        delete document.body.dataset.adminView;
        if ($('nc-root')) { $('nc-root').inert = false; $('nc-root').removeAttribute('aria-hidden'); }
        if (guide.open) guide.close();
      }
    }
  }
  window.addEventListener('storage', sync);
  window.addEventListener('focus', sync);
  // Un solo timer leggero per login/logout del CMS, senza dipendere dalle sue classi CSS.
  setInterval(sync, 1000);
  sync();
  search();
})();
