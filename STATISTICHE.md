# Statistiche degli accessi

Nel pannello `/admin`, dopo il login GitHub, la panoramica contiene la voce **Statistiche**
e la scheda **Come va il sito?**. Nell'editor le statistiche sono disponibili dalla barra in basso.
Il pannello mostra periodi di 7, 30 e 90 giorni, visualizzazioni giornaliere, pagine
più viste, provenienza delle visualizzazioni, dispositivi e clic su WhatsApp, telefono
ed email. Il pulsante **Aggiorna** rilegge i dati.

## Attivazione su Vercel

Il sito è statico e le funzioni serverless non conservano file tra le richieste:
per questo i contatori usano un database Redis persistente, separato dai contenuti.

1. Nel progetto Vercel collega un database **Upstash Redis** dalla sezione Storage / Marketplace,
   oppure usa un database Upstash Redis già disponibile.
2. Nelle variabili d'ambiente del progetto imposta, per Production:
   - `UPSTASH_REDIS_REST_URL`: endpoint HTTPS REST del database;
   - `UPSTASH_REDIS_REST_TOKEN`: token REST con permessi di lettura e scrittura.
3. Pubblica queste modifiche con il consueto flusso GitHub → Vercel, oppure esegui un
   nuovo deploy se hai aggiunto le variabili dopo la pubblicazione.
4. Visita il sito pubblico da un browser senza accesso admin salvato, poi entra in
   `/admin` e apri **Statistiche del sito**. Una visualizzazione deve comparire nel giorno corrente.
   Per questa verifica disattiva l'eventuale richiesta Do Not Track / Global Privacy Control.

Le credenziali rimangono sul server: non inserirle nel codice o nei file del sito.
In assenza di configurazione il pannello mostra un messaggio esplicito, senza dati di esempio.
L'anteprima Python sul Mac non esegue le API JavaScript di Vercel e non raccoglie accessi.
La configurazione Netlify preesistente non esegue queste funzioni: questa integrazione,
come il login attuale in `api/`, è destinata a Vercel.

## Come leggere i dati

- **Visualizzazioni:** aperture delle pagine visibili, inclusi i ricaricamenti.
  Non sono visitatori unici né sessioni; non si cerca di identificare le persone.
- **Provenienza:** origine di ciascuna visualizzazione, non attribuzione della prima visita.
  Una navigazione tra pagine del sito compare come “Interna”. Se il browser non invia
  un referrer, compare “Diretta / sconosciuta”. Sono conservate solo categorie di provenienza,
  mai URL completi, query o messaggi.
- **Dispositivi:** stima dalla categoria del browser, senza salvare lo user agent.
- **Clic:** attivazioni dei link di contatto; non garantiscono messaggi inviati o prenotazioni.
- Giorni nel fuso **Europe/Rome**; conservazione di **100 giorni**. I dati partono
  dall'attivazione e non ricostruiscono gli accessi precedenti.
- Nessun cookie o identificativo persistente aggiunto al visitatore. Nessun IP viene
  scritto nel database da questa funzione. I log tecnici dell'hosting restano separati.
- Sono esclusi i bot riconoscibili, i browser automatizzati, Do Not Track / Global Privacy
  Control, le anteprime e i browser dove Decap conserva un token admin.
  Blocco JavaScript, filtri e bot non riconosciuti possono influire sui conteggi.

## Accesso e conservazione

La lettura passa da `/api/analytics` e richiede il token del login Decap già esistente.
L'API verifica su GitHub che l'utente abbia il permesso `push` sul repository
`AndreaCoffaro/immagine-bellezza`: il solo accesso a un repository pubblico non basta.
Il logout chiude la vista e cancella i dati mostrati. Le risposte non sono memorizzate in cache.

La raccolta accetta soltanto il dominio ufficiale `https://www.immaginebellezzamantio.it`,
le pagine presenti nel manifest e quattro tipi di evento. Gli incrementi Redis sono
atomici e ogni giorno ha un massimo di 100.000 eventi. Come ogni contatore pubblico,
non costituisce una misura antifrode: un client appositamente costruito può simulare eventi.

## Sitemap e generazione

`sitemap.xml` esisteva già; la copia locale è stata aggiornata con le **14 pagine pubbliche**
attuali, incluse le immagini. `robots.txt` contiene già il collegamento alla sitemap.
`prerender.py` rigenera a ogni pubblicazione sitemap, pagine e `lib/analytics-pages.json`,
la whitelist usata dall'API per accettare solo pagine pubblicate.
Le pagine non pubblicate e `/admin` non sono incluse nella sitemap.

## Verifiche di sviluppo

Con Node.js disponibile: `node tests/analytics.test.cjs`.
Per controllare la generazione senza modificare la homepage sorgente, usa
`python3 prerender.py --cartella /percorso/copia-del-sito` su una copia del progetto.

Riferimenti tecnici: [Redis REST API](https://upstash.com/docs/redis/features/restapi),
[autenticazione Decap](https://github.com/decaporg/decap-cms/blob/main/packages/decap-cms-core/src/backend.ts).
