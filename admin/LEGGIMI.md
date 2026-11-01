# Pannello di gestione

Dopo il login, `/admin` apre una panoramica con 12 sezioni e scorciatoie per
listino, promozioni e statistiche. La ricerca comprende anche sinonimi come
“prezzi”, “immagini”, “WhatsApp” e i nomi dei trattamenti. I filtri consentono
di separare servizi e offerte, contenuti del centro, pagine e blog.

Una scheda apre il contenuto nell'editor Decap esistente. La barra in basso permette
di tornare alla panoramica, consultare statistiche, aprire la guida o visitare il sito.
“Pannello completo e account” mostra l'interfaccia Decap con raccolte, media e menu account,
da cui è possibile uscire. Il ritorno alla panoramica lascia l'editor montato: i campi
non vengono ricreati. I cambi di contenuto passano dal router Decap, che continua
a gestire l'avviso sulle modifiche non salvate.

Le modifiche ai contenuti si pubblicano con **Pubblica → Pubblica ora** nell'editor.
La panoramica non pubblica automaticamente. I link diretti a una voce o a un nuovo
articolo continuano ad aprire l'editor. Nell'anteprima locale è indicato che i file
sono salvati sul Mac e vanno caricati su GitHub per pubblicarli online.

## File

- `admin.js`: panoramica, ricerca, filtri, guida e sincronizzazione con il login esistente.
- `admin.css`: impaginazione responsive, palette del centro e piccoli miglioramenti ai campi.
- `statistiche.js` / `statistiche.css`: dialogo delle statistiche con caricamento, grafico,
  date, nomi leggibili delle pagine e spiegazioni dei conteggi.
- `config.yml`: schema dei contenuti invariato; nomi più brevi e liste con riepilogo richiuse.

La nuova interfaccia non aggiunge librerie o chiamate periodiche alla rete. I file
JavaScript vengono caricati con `defer`. Il controllo dello stato login è locale.
Le classi CSS della panoramica sono isolate da quelle generate da Decap.
Per aggiungere una nuova sezione, aggiorna sia `config.yml` sia l'elenco `sections` in `admin.js`.

La panoramica non sostituisce la protezione server: l'API delle statistiche continua
a verificare su GitHub i permessi del token. Nessuna modifica alle credenziali OAuth.
L'attivazione dei dati reali richiede ancora Redis: vedi `../STATISTICHE.md`.
