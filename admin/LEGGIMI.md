# Pannello di gestione

Dopo il login, `/admin` apre una panoramica con 12 sezioni e scorciatoie per
listino, promozioni e statistiche. La ricerca comprende anche sinonimi come
“prezzi”, “immagini”, “WhatsApp” e i nomi dei trattamenti. I filtri consentono
di separare servizi e offerte, contenuti del centro, pagine e blog.

Una scheda apre il contenuto nell'editor Decap. La navigazione laterale rimane visibile
anche nelle schermate interne, con lo stesso stile della panoramica: permette di cambiare
sezione, tornare alla panoramica, consultare statistiche, aprire la guida o visitare il sito.
Su cellulare le sezioni sono disposte in due righe di navigazione scorrevoli.
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
- `editor.css`: tema comune per raccolte, editor, ricerca, pulsanti di pubblicazione,
  liste, libreria foto, menu, finestre e login. Le barre dell'editor si adattano allo
  spazio disponibile senza coprire i campi sottostanti.
- `editor.js`: indice “Vai a un campo”, costruito dai campi effettivamente presenti
  nell'editor. Porta alla voce scelta e sposta il focus sul suo controllo.
- `statistiche.js` / `statistiche.css`: dialogo delle statistiche con caricamento, grafico,
  date, nomi leggibili delle pagine e spiegazioni dei conteggi.
- `config.yml`: schema dei contenuti invariato; nomi più brevi e liste con riepilogo richiuse.

La nuova interfaccia non aggiunge librerie o chiamate periodiche alla rete. I file
JavaScript vengono caricati con `defer`. Il controllo dello stato login è locale.
Le classi CSS della panoramica sono isolate da quelle generate da Decap.
Il tema interno usa i label dei componenti e quattro target di layout della distribuzione
**Decap 3.17.3**, fissata in `index.html` per evitare cambiamenti automatici ai selettori.
Prima di aggiornare Decap controllare il tema, i target in `editor.css` e l'indice dei campi
in `editor.js`. La libreria foto conserva il suo indicatore nativo di selezione.
Per aggiungere una nuova sezione, aggiorna sia `config.yml` sia l'elenco `sections` in `admin.js`.

La panoramica non sostituisce la protezione server: l'API delle statistiche continua
a verificare su GitHub i permessi del token. Nessuna modifica alle credenziali OAuth.
L'attivazione dei dati reali richiede ancora Redis: vedi `../STATISTICHE.md`.
