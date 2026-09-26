/* =========================================================================
   I CONTENUTI DEL SITO NON SONO PIÙ QUI.
   Prezzi, trattamenti, promozioni, foto, testi, contatti e orari si trovano
   nella cartella /content (file .json) e si modificano dal pannello di
   gestione: https://<tuo-dominio>/admin
   Questo file si occupa solo di leggere quei dati e costruire la pagina.
   ========================================================================= */

const FILE_CONTENUTI = ["contatti", "home", "listino", "spa", "promozioni", "eventi", "regalo", "chi-siamo", "galleria", "recensioni"];
const C = {};                      // qui finiscono i contenuti letti da /content
let WHATSAPP = "393470096504";     // aggiornato da contatti.json

/* ---------- Utilità ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
// *parola* diventa corsivo colorato (come "bellezza" nel titolo)
const fmt = s => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
const get = (path, obj = C) => path.split(".").reduce((o, k) => o?.[k], obj);
const soloCifre = s => String(s || "").replace(/[^\d]/g, "");
const waLink = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
const icon = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/* Foto: online su Netlify vengono ridimensionate e convertite al volo (più leggere);
   in anteprima locale si usa il file così com'è. */
const SU_NETLIFY = location.protocol.startsWith("http") && !/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
const imgUrl = (src, w = 1400) => {
  if(!src) return "";
  if(/^https?:/.test(src)) return src;
  const path = "/" + String(src).replace(/^\/+/, "");
  return SU_NETLIFY ? `/.netlify/images?url=${encodeURIComponent(path)}&w=${w}&q=80` : path.slice(1);
};
const objPos = f => f?.pos ? ` style="object-position:${esc(f.pos)}"` : "";
const imgTag = (f, w, extra = "") => `<img src="${imgUrl(f.src, w)}" alt="${esc(f.alt)}"${objPos(f)} ${extra}>`;

async function caricaContenuti(){
  await Promise.all(FILE_CONTENUTI.map(async nome => {
    try {
      const r = await fetch(`content/${nome}.json`, { cache:"no-cache" });
      if(!r.ok) throw new Error(r.status);
      C[nome.replace("-", "_")] = await r.json();
    } catch(e){
      console.warn(`Impossibile leggere content/${nome}.json`, e);
      C[nome.replace("-", "_")] = {};
    }
  }));
}

/* ---------- Testi semplici: <el data-t="spa.titolo"> ---------- */
function applicaTesti(){
  $$("[data-t]").forEach(el => {
    const v = get(el.dataset.t);
    if(typeof v === "string" && v.trim()) el.innerHTML = fmt(v);
  });
  $$("[data-wa-t]").forEach(el => {
    const v = get(el.dataset.waT);
    if(v) el.dataset.wa = v;
  });
}

/* ---------- Contatti (telefono, email, indirizzo, social, P.IVA) ---------- */
function applicaContatti(){
  const k = C.contatti || {};
  if(soloCifre(k.whatsapp)) WHATSAPP = soloCifre(k.whatsapp);
  const tel = soloCifre(k.telefono);
  if(tel){
    $$('a[href^="tel:"]').forEach(a => a.href = `tel:+${tel}`);
    $$("[data-c='telefono']").forEach(el => el.textContent = k.telefono);
    $$("[data-c='telefono-breve']").forEach(el => el.textContent = k.telefono.replace(/^\+39\s*/, ""));
  }
  const indirizzo = [k.indirizzo, [k.cap, k.citta].filter(Boolean).join(" "), k.provincia ? `(${k.provincia})` : ""].filter(Boolean).join(", ").replace(", (", " (");
  $$("[data-c='indirizzo']").forEach(el => el.textContent = indirizzo || k.citta || "");
  $$("[data-c='email']").forEach(el => {
    if(k.email){ el.textContent = k.email; el.href = `mailto:${k.email}`; el.closest("li").hidden = false; }
    else el.closest("li").hidden = true;
  });
  $$("[data-c-link]").forEach(el => {
    const url = k[el.dataset.cLink];
    if(url){ el.href = url; el.closest("li, span").hidden = false; }
    else el.closest("li, span").hidden = true;
  });
  const piva = $("[data-c='piva']");
  if(piva) piva.textContent = k.partita_iva ? ` — P.IVA ${k.partita_iva}` : "";
  const legali = $("[data-legali]");
  if(legali) legali.hidden = !k.privacy && !k.cookie;

  const mappa = $("#mappa");
  const query = encodeURIComponent([k.indirizzo, k.cap, k.citta, k.provincia].filter(Boolean).join(", ") || k.nome_centro);
  $("#link-maps")?.setAttribute("href", `https://www.google.com/maps/search/?api=1&query=${query}`);
  // Mappa: quella incollata dal pannello (Google Maps → Condividi → Incorpora), altrimenti generata dall'indirizzo
  const incollata = (k.mappa_embed || "").match(/https:\/\/www\.google\.com\/maps\/embed\?[^"'\s]+/);
  const dove = [k.indirizzo, k.cap, k.citta, k.provincia].filter(Boolean).join(", ");
  const src = incollata ? incollata[0] : (k.indirizzo ? `https://www.google.com/maps?q=${encodeURIComponent(dove)}&output=embed` : "");
  if(mappa && src){
    mappa.innerHTML = `<iframe src="${esc(src)}" loading="lazy" title="Mappa ${esc(k.nome_centro || "")}" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
  }

  datiStrutturati(k, indirizzo);
}

/* Dati per Google (scheda attività locale) generati dai contatti */
function datiStrutturati(k, indirizzo){
  const giorniEn = { lunedi:"Monday", martedi:"Tuesday", mercoledi:"Wednesday", giovedi:"Thursday", venerdi:"Friday", sabato:"Saturday", domenica:"Sunday" };
  const orari = [];
  Object.entries(k.orari || {}).forEach(([g, o]) => {
    if(!o?.aperto) return;
    [[o.dalle, o.alle], [o.dalle_2, o.alle_2]].forEach(([a, c]) => {
      if(a && c) orari.push({ "@type":"OpeningHoursSpecification", dayOfWeek:giorniEn[g], opens:a, closes:c });
    });
  });
  const ld = {
    "@context":"https://schema.org", "@type":["BeautySalon", "DaySpa"],
    name:`${k.nome_centro || "Immagine & Bellezza"} di Maria Rita Mantio`,
    url:location.origin + "/", image:location.origin + "/images/logo.png",
    telephone:k.telefono, email:k.email || undefined, priceRange:"€€",
    address:{ "@type":"PostalAddress", streetAddress:k.indirizzo || undefined, addressLocality:k.citta, addressRegion:k.provincia, postalCode:k.cap, addressCountry:"IT" },
    openingHoursSpecification:orari,
    sameAs:[k.instagram, k.facebook].filter(Boolean),
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

/* ---------- Orari + "Aperto ora" ---------- */
const GIORNI = [["lunedi","Lunedì"],["martedi","Martedì"],["mercoledi","Mercoledì"],["giovedi","Giovedì"],["venerdi","Venerdì"],["sabato","Sabato"],["domenica","Domenica"]];
const fasceDi = o => !o?.aperto ? [] : [[o.dalle, o.alle], [o.dalle_2, o.alle_2]].filter(([a, c]) => a && c);
const testoOrario = o => { const f = fasceDi(o); return f.length ? f.map(([a, c]) => `${a} – ${c}`).join(" / ") : "Chiuso"; };

function renderOrari(){
  const orari = C.contatti?.orari;
  const dl = $("#orari-lista");
  if(!orari || !dl) return;
  const oggi = (new Date().getDay() + 6) % 7;   // 0 = lunedì
  // raggruppa giorni consecutivi con lo stesso orario (es. "Martedì – Venerdì")
  const gruppi = [];
  GIORNI.forEach(([k, nome], i) => {
    const t = testoOrario(orari[k]);
    const ultimo = gruppi[gruppi.length - 1];
    if(ultimo && ultimo.t === t) { ultimo.fine = nome; ultimo.idx.push(i); }
    else gruppi.push({ inizio:nome, fine:null, t, idx:[i] });
  });
  dl.innerHTML = gruppi.map(g => {
    const cls = g.idx.includes(oggi) ? ' class="oggi"' : "";
    return `<dt${cls}>${g.fine ? `${g.inizio} – ${g.fine}` : g.inizio}</dt><dd${cls}>${g.t}</dd>`;
  }).join("");

  const el = $("#stato-apertura");
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fasce = fasceDi(orari[GIORNI[oggi][0]]);
  if(fasce.length){
    const aperto = fasce.some(([a, c]) => mins >= toMin(a) && mins < toMin(c));
    el.textContent = aperto ? "Aperto ora" : "Chiuso ora";
    el.className = "stato " + (aperto ? "aperto" : "chiuso");
  } else {
    el.textContent = "Oggi chiuso";
    el.className = "stato chiuso";
  }
}

/* ---------- Liste con icone (punti hero, punti di forza, SPA, eventi) ---------- */
function renderListe(){
  const hero = get("home.hero.punti");
  if(hero?.length) $("#hero-facts").innerHTML = hero.map(p => `<li>${icon(p.icona)}${esc(p.testo)}</li>`).join("");

  const forza = get("home.punti_di_forza");
  if(forza?.length) $("#pillars").innerHTML = forza.map(p =>
    `<div class="pillar reveal">${icon(p.icona)}<div><h3>${esc(p.titolo)}</h3><p>${esc(p.testo)}</p></div></div>`).join("");

  const car = get("spa.caratteristiche");
  if(car?.length) $("#spa-features").innerHTML = car.map(p =>
    `<li>${icon(p.icona)}<div><strong>${esc(p.titolo)}</strong><span>${esc(p.testo)}</span></div></li>`).join("");

  const occ = get("eventi.occasioni");
  if(occ?.length) $("#occasioni").innerHTML = occ.map(o => `<li>${esc(o)}</li>`).join("");
  const ep = get("eventi.punti");
  if(ep?.length) $("#eventi-features").innerHTML = ep.map(p =>
    `<li>${icon(p.icona)}<div><strong>${esc(p.titolo)}</strong><span>${esc(p.testo)}</span></div></li>`).join("");
  const ef = get("eventi.foto");
  if(ef?.src){
    const b = $("#eventi-foto");
    b.dataset.gallery = imgUrl(ef.src, 2000);
    b.innerHTML = imgTag(ef, 1400, 'loading="lazy"');
  }

  const rp = get("regalo.punti");
  if(rp?.length) $("#regalo-punti").innerHTML = rp.map(p => `<li>${esc(p)}</li>`).join("");

  const testo = get("chi_siamo.testo");
  if(testo) $("#chi-testo").innerHTML = testo.split(/\n\s*\n/).map(p => `<p>${fmt(p.trim())}</p>`).join("");
  const fg = get("chi_siamo.foto_grande"), fp = get("chi_siamo.foto_piccola");
  if(fg?.src) $("#chi-foto-grande").outerHTML = imgTag(fg, 1000, 'id="chi-foto-grande" loading="lazy"');
  if(fp?.src) $("#chi-foto-piccola").outerHTML = imgTag(fp, 600, 'id="chi-foto-piccola" class="chi-img-small" loading="lazy"');
}

/* ---------- Listino trattamenti (schede per categoria) ---------- */
function renderServizi(){
  const categorie = (get("listino.categorie") || []).filter(c => c.categoria);
  const tabs = $("#tabs-servizi");
  const panelWrap = $("#grid-servizi");
  if(!categorie.length){ tabs.innerHTML = ""; panelWrap.innerHTML = ""; return; }

  tabs.innerHTML = categorie.map((c, i) => `
    <button class="tab" role="tab" id="tab-${i}" aria-controls="panel-servizi" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(c.categoria)}</button>`).join("");

  const show = i => {
    const c = categorie[i];
    const servizi = c.servizi || [];
    const n = servizi.length;
    panelWrap.innerHTML = `
      <div class="tab-panel" role="tabpanel" id="panel-servizi" aria-labelledby="tab-${i}">
        <div class="intro">
          <span class="count">${n} ${n === 1 ? "trattamento" : "trattamenti"}</span>
          <h3>${esc(c.categoria)}</h3>
          <p>${esc(c.descrizione)}</p>
          <a class="btn btn-primary btn-sm" href="${waLink(`Ciao! Vorrei informazioni / prenotare: ${c.categoria}.`)}" target="_blank" rel="noopener">${icon("whatsapp")}Prenota ${esc(c.categoria.toLowerCase())}</a>
        </div>
        <ul class="servizi-lista${n < 5 ? " single" : ""}">
          ${servizi.map(s => `<li class="servizio-riga">
              <span>${esc(s.nome)}</span><i aria-hidden="true"></i><strong>${esc(s.prezzo)}</strong></li>`).join("")}
        </ul>
      </div>`;
    tabs.querySelectorAll(".tab").forEach((t, j) => {
      t.setAttribute("aria-selected", j === i);
      t.tabIndex = j === i ? 0 : -1;
    });
  };

  const buttons = [...tabs.querySelectorAll(".tab")];
  buttons.forEach((b, i) => {
    b.addEventListener("click", () => {
      show(i);
      b.scrollIntoView({ block:"nearest", inline:"center", behavior:"smooth" });
    });
    b.addEventListener("keydown", e => {
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if(!dir) return;
      e.preventDefault();
      const next = (i + dir + buttons.length) % buttons.length;
      buttons[next].focus();
      show(next);
    });
  });
  show(0);
}

/* ---------- Percorsi SPA ---------- */
function renderSpa(){
  const percorsi = get("spa.percorsi") || [];
  $("#lista-spa").innerHTML = percorsi.map(s => `
    <article class="pacchetto reveal${s.evidenza ? " evidenza" : ""}">
      ${s.etichetta ? `<span class="tag">${esc(s.etichetta)}</span>` : ""}
      <h3>${esc(s.nome)}</h3>
      <p>${esc(s.descrizione)}</p>
      ${s.include?.length ? `<ul>${s.include.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="foot">
        <span class="prezzo">${esc(s.prezzo)}<small>${esc(s.nota)}</small></span>
        <a class="btn ${s.evidenza ? "btn-light" : "btn-ghost-light"} btn-sm" href="${waLink(`Ciao! Vorrei prenotare: ${s.nome}.`)}" target="_blank" rel="noopener">Prenota</a>
      </div>
    </article>`).join("");

  // la card nell'hero mostra il primo percorso
  const card = $(".hero-card");
  if(percorsi[0] && card){
    card.innerHTML = `<strong>${esc(percorsi[0].nome)}</strong><span>da <b>${esc(percorsi[0].prezzo)}</b> ${esc(percorsi[0].nota)}</span>`;
  } else if(card) card.hidden = true;
}

/* ---------- Promozioni ---------- */
const euro = v => { const s = String(v ?? "").trim(); return !s ? "" : s.includes("€") ? s : `€ ${s}`; };
function renderPromozioni(){
  const promo = (get("promozioni.promozioni") || []).filter(p => p.titolo);
  $("#promozioni").hidden = promo.length === 0;
  $("#grid-promo").innerHTML = promo.map(p => `
    <article class="card-promo reveal">
      ${p.etichetta ? `<span class="badge">${esc(p.etichetta)}</span>` : ""}
      <h3>${esc(p.titolo)}</h3>
      <p>${esc(p.descrizione)}</p>
      <div class="prezzi">
        ${p.prezzo_pieno ? `<span class="prezzo-vecchio">${esc(euro(p.prezzo_pieno))}</span>` : ""}
        ${p.prezzo_scontato ? `<span class="prezzo-nuovo">${esc(euro(p.prezzo_scontato))}</span>` : ""}
      </div>
      <a class="btn btn-outline btn-sm" href="${waLink(`Ciao! Mi interessa la promozione "${p.titolo}".`)}" target="_blank" rel="noopener">Approfitta dell'offerta</a>
    </article>`).join("");
}

/* ---------- Mosaico foto SPA (le caselle cambiano foto a turno) ---------- */
const fotoSpa = () => (get("spa.foto") || []).filter(f => f.src);
function renderFotoSpa(){
  const foto = fotoSpa();
  const caselle = Math.min(4, foto.length);
  $("#spa-mosaic").innerHTML = foto.slice(0, caselle).map((f, i) => `
    <button class="m m${i + 1}" data-gallery="${imgUrl(f.src, 2000)}" data-set="spa" aria-label="Ingrandisci: ${esc(f.alt)}">
      ${imgTag(f, 1200, 'loading="lazy"')}
    </button>`).join("");
}

function initSpaRotazione(){
  const foto = fotoSpa();
  const tiles = $$("#spa-mosaic .m");
  if(foto.length <= tiles.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const mostrate = tiles.map((_, i) => i);       // indice della foto in ogni casella
  let prossima = tiles.length;                    // prossima foto da mostrare
  let turno = 0;                                  // casella che cambia
  const ordine = [1, 3, 0, 2].filter(i => i < tiles.length);

  const cambia = () => {
    if(document.hidden || $("#lightbox")?.open) return;
    const t = ordine[turno++ % ordine.length];
    const tile = tiles[t];
    if(tile.matches(":hover")) return;
    while(mostrate.includes(prossima % foto.length)) prossima++;
    const i = prossima++ % foto.length;
    const f = foto[i];
    const pre = new Image();
    pre.onload = () => {
      const nuova = document.createElement("img");
      nuova.src = pre.src; nuova.alt = f.alt || ""; nuova.className = "entra";
      if(f.pos) nuova.style.objectPosition = f.pos;
      tile.appendChild(nuova);
      nuova.addEventListener("animationend", () => {
        [...tile.querySelectorAll("img")].slice(0, -1).forEach(v => v.remove());
        nuova.classList.remove("entra");
      }, { once:true });
      tile.dataset.gallery = imgUrl(f.src, 2000);
      tile.setAttribute("aria-label", `Ingrandisci: ${f.alt || ""}`);
      mostrate[t] = i;
    };
    pre.src = imgUrl(f.src, 1200);
  };
  setInterval(cambia, 3200);
}

/* ---------- Galleria struttura ---------- */
const ZONE = { accoglienza:"Accoglienza", cabine:"Cabine", spa:"SPA" };

function renderGalleria(){
  const tutte = (get("galleria.foto") || []).filter(f => f.src);
  const foto = tutte.filter(f => !f.evidenza);
  const grid = $("#grid-galleria");
  const bottone = (g, w, dentro = "") => `
    <button class="gal-foto" data-set="galleria" data-zona="${esc(g.zona || "")}" data-nome="${esc(g.nome || g.alt)}" data-gallery="${imgUrl(g.src, 2000)}" aria-label="Ingrandisci: ${esc(g.nome || g.alt)}">
      ${imgTag({ ...g, alt:g.alt || g.nome || "" }, w, 'loading="lazy"')}${dentro}
    </button>`;
  const zona = g => g.zona && ZONE[g.zona] ? ZONE[g.zona] : "";
  grid.innerHTML = foto.map(g => bottone(g, 1000,
    g.nome ? `<span class="gal-cap">${zona(g) ? `<small>${zona(g)}</small>` : ""}${esc(g.nome)}</span>` : "")).join("");

  // Foto "in evidenza": riquadro grande, sempre intera (mai ritagliata), con testo e pulsante
  $("#evidenza-galleria").innerHTML = tutte.filter(f => f.evidenza).map(g => `
    <article class="gal-evidenza" data-zona="${esc(g.zona || "")}">
      ${bottone(g, 1600)}
      <div class="gal-evidenza-testo">
        ${zona(g) ? `<span class="eyebrow">${zona(g)}</span>` : ""}
        <h3>${fmt(g.nome || "")}</h3>
        ${g.testo ? `<p>${esc(g.testo)}</p>` : ""}
        <a class="btn btn-primary btn-sm" href="${waLink(`Ciao! Vorrei prenotare un appuntamento: ${g.nome || ""}.`)}" target="_blank" rel="noopener">${icon("whatsapp")}Prenota su WhatsApp</a>
      </div>
    </article>`).join("");

  // Filtri per zona: compaiono solo se le foto appartengono ad almeno due zone
  const zone = Object.keys(ZONE).filter(z => tutte.some(f => f.zona === z));
  const box = $("#zone-galleria");
  box.hidden = zone.length < 2;
  box.innerHTML = ["", ...zone].map(z =>
    `<button type="button" data-zona="${z}" aria-pressed="${z === ""}">${z ? ZONE[z] : "Tutto"}</button>`).join("");
  box.onclick = e => {
    const b = e.target.closest("button");
    if(!b) return;
    box.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    $$("#grid-galleria .gal-foto, .gal-evidenza").forEach(f => {
      f.hidden = !!b.dataset.zona && f.dataset.zona !== b.dataset.zona;
    });
    grid.scrollLeft = 0;
    grid.dispatchEvent(new Event("scroll"));
  };
  initCarosello(grid);
}

/* Su mobile galleria e schede diventano caroselli orizzontali: sotto c'è un .car-nav
   con contatore, barra di avanzamento e frecce (su computer è nascosto dal CSS) */
function initCarosello(track){
  const nav = track.nextElementSibling;
  if(!nav?.classList.contains("car-nav")) return;
  const [count, bar, prev, next] = [".car-count", ".car-bar i", ".car-prev", ".car-next"].map(s => nav.querySelector(s));
  const visibili = () => [...track.children].filter(el => !el.hidden);
  const aggiorna = () => {
    const el = visibili();
    if(!el.length) return;
    const passo = el[1] ? el[1].offsetLeft - el[0].offsetLeft : track.clientWidth;
    const fine = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    const i = fine ? el.length - 1 : Math.min(el.length - 1, Math.round(track.scrollLeft / Math.max(1, passo)));
    count.textContent = `${i + 1} / ${el.length}`;
    bar.style.width = `${(i + 1) / el.length * 100}%`;
    prev.disabled = i === 0;
    next.disabled = i === el.length - 1;
  };
  const scorri = dir => {
    const el = visibili();
    const passo = el[1] ? el[1].offsetLeft - el[0].offsetLeft : track.clientWidth;
    track.scrollBy({ left:dir * passo, behavior:"smooth" });
  };
  prev.onclick = () => scorri(-1);
  next.onclick = () => scorri(1);
  let raf = 0;
  track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(aggiorna); }, { passive:true });
  aggiorna();
}

/* ---------- Apparecchiature (schede sotto la galleria) ---------- */
function renderTecnologie(){
  const lista = (get("galleria.tecnologie") || []).filter(t => t.nome);
  $("#tecnologie").hidden = lista.length === 0;
  $("#grid-tecnologie").innerHTML = lista.map(t => `
    <article class="tecno reveal">
      ${t.foto?.src ? `
      <button class="tecno-img" data-gallery="${imgUrl(t.foto.src, 2000)}" aria-label="Ingrandisci: ${esc(t.foto.alt || t.nome)}">
        ${imgTag({ ...t.foto, alt:t.foto.alt || t.nome }, 800, 'loading="lazy"')}
      </button>` : ""}
      <div class="tecno-body">
        ${t.categoria ? `<span class="tecno-cat">${esc(t.categoria)}</span>` : ""}
        <h3>${esc(t.nome)}</h3>
        <p>${esc(t.descrizione)}</p>
        ${t.benefici?.length ? `<ul class="tecno-benefici">${t.benefici.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
        <a class="tecno-cta" href="${waLink(`Ciao! Vorrei informazioni sui trattamenti con ${t.nome}.`)}" target="_blank" rel="noopener">${icon("whatsapp")}Chiedi informazioni</a>
      </div>
    </article>`).join("");
  initCarosello($("#grid-tecnologie"));
}

/* ---------- Recensioni ---------- */
function renderRecensioni(){
  const rec = (get("recensioni.recensioni") || []).filter(r => r.testo);
  $("#recensioni").hidden = rec.length === 0;
  $("#grid-recensioni").innerHTML = rec.map(r => {
    const stelle = Math.max(1, Math.min(5, Number(r.stelle) || 5));
    return `
    <figure class="recensione reveal">
      <div class="stelle" aria-label="${stelle} stelle su 5">${icon("star").repeat(stelle)}</div>
      <blockquote>“${esc(r.testo)}”</blockquote>
      <cite>— ${esc(r.nome)}</cite>
    </figure>`;
  }).join("");
}

/* ---------- Foto che si alternano (hero e buono regalo) ---------- */
function slideshow(box, foto, w, durata, prima = false){
  if(!box || !foto.length) return;
  box.innerHTML = foto.map((f, i) =>
    imgTag(f, w, `${i === 0 && prima ? 'fetchpriority="high"' : 'loading="lazy"'}${i === 0 ? ' class="on"' : ""}`)).join("");
  const imgs = box.querySelectorAll("img");
  if(imgs.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  setInterval(() => {
    if(document.hidden) return;
    imgs[i].classList.remove("on");
    i = (i + 1) % imgs.length;
    imgs[i].classList.add("on");
  }, durata);
}
function initHero(){
  const box = $("#hero-arch");
  slideshow(box, (get("home.foto") || []).filter(f => f.src), 1000, 5500, true);
  box?.removeAttribute("role");
  box?.removeAttribute("aria-label");
}
const initRegalo = () => slideshow($("#regalo-slides"), (get("regalo.foto") || []).filter(f => f.src), 1200, 4500);

/* ---------- Comportamenti della pagina ---------- */
function initWhatsappLinks(){
  $$("[data-wa]").forEach(a => {
    a.href = waLink(a.dataset.wa);
    a.target = "_blank";
    a.rel = "noopener";
  });
}

function initMenu(){
  const toggle = $(".nav-toggle");
  const nav = $("nav.main");
  const setOpen = open => {
    nav.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if(e.key === "Escape") setOpen(false); });
  document.body.addEventListener("click", e => {
    if(nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });
  matchMedia("(min-width: 1121px)").addEventListener("change", e => { if(e.matches) setOpen(false); });
}

function initScrollUI(){
  const header = $("header.site");
  const float = $(".wa-float");
  const bar = $(".mobile-bar");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 8);
    const show = y > 480;
    float.classList.toggle("show", show);
    bar.classList.toggle("show", show);
  };
  addEventListener("scroll", onScroll, { passive:true });
  onScroll();

  // Nome del centro: passa nella barra in alto appena la barra copre del tutto quello dell'hero
  const brandName = $("#hero-brand .hero-brand-name");
  if(brandName){
    const checkBrand = () => {
      const coperto = brandName.getBoundingClientRect().bottom <= header.getBoundingClientRect().bottom;
      header.classList.toggle("brand-in-hero", !coperto);
    };
    addEventListener("scroll", checkBrand, { passive:true });
    addEventListener("resize", checkBrand);
    checkBrand();
  }

  // Evidenzia nel menu la sezione visibile
  const links = $$('nav.main ul a[href^="#"]');
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if(!en.isIntersecting) return;
      links.forEach(a => a.classList.remove("active"));
      map.get(en.target.id)?.classList.add("active");
    });
  }, { rootMargin:"-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if(s) io.observe(s); });
}

function initReveal(){
  const els = $$(".reveal");
  if(!("IntersectionObserver" in window)){ els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if(!en.isIntersecting) return;
      // piccolo ritardo a cascata per elementi affiancati
      const siblings = [...en.target.parentElement.children].filter(c => c.classList.contains("reveal"));
      en.target.style.transitionDelay = `${Math.min(siblings.indexOf(en.target), 5) * 80}ms`;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { rootMargin:"0px 0px -8% 0px", threshold:.08 });
  els.forEach(e => io.observe(e));
}

function initLightbox(){
  const dlg = $("#lightbox");
  if(!dlg || typeof dlg.showModal !== "function") return;
  const img = dlg.querySelector("img");
  const cap = dlg.querySelector("figcaption");
  let items = [], idx = 0;

  const show = i => {
    idx = (i + items.length) % items.length;
    img.src = items[idx].src;
    img.alt = items[idx].alt;
    cap.textContent = img.alt;
  };
  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-gallery]");
    if(!trigger) return;
    // Foto SPA: si sfogliano tutte, anche quelle non visibili nel mosaico
    // Galleria: si sfogliano solo le foto della zona scelta, con il nome dell'ambiente come didascalia
    const set = trigger.dataset.set;
    items = set === "spa"
      ? fotoSpa().map(f => ({ src:imgUrl(f.src, 2000), alt:f.alt || "" }))
      : $$(set ? `[data-set="${set}"]` : "[data-gallery]:not([data-set])")
          .filter(b => !b.closest("[hidden]"))
          .map(b => ({ src:b.dataset.gallery, alt:b.dataset.nome || b.querySelector("img")?.alt || "" }));
    show(Math.max(0, items.findIndex(it => it.src === trigger.dataset.gallery)));
    dlg.showModal();
  });
  dlg.querySelector(".lb-close").addEventListener("click", () => dlg.close());
  dlg.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
  dlg.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
  dlg.addEventListener("click", e => { if(e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", e => {
    if(e.key === "ArrowRight") show(idx + 1);
    if(e.key === "ArrowLeft") show(idx - 1);
  });
  // swipe su mobile
  let x0 = null;
  dlg.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive:true });
  dlg.addEventListener("touchend", e => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* ---------- Avvio ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  initScrollUI();
  initLightbox();

  await caricaContenuti();
  const passi = [applicaContatti, applicaTesti, renderListe, renderOrari, renderPromozioni, renderSpa, renderServizi,
                 renderFotoSpa, renderGalleria, renderTecnologie, renderRecensioni, initHero, initRegalo, initSpaRotazione, initWhatsappLinks];
  // se una sezione ha dati incompleti, le altre vengono comunque mostrate
  passi.forEach(f => { try { f(); } catch(e){ console.error(`Errore in ${f.name}:`, e); } });
  initReveal();
});
