// Conteggi aggregati, senza cookie né identificativi del visitatore.
(() => {
  if (location.hostname !== 'www.immaginebellezzamantio.it' || navigator.webdriver ||
      navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  // Esclude le visite dello stesso browser usato per amministrare il sito.
  try { if (JSON.parse(localStorage.getItem('decap-cms-user') || 'null')?.token) return; } catch (_) {}
  let path = location.pathname.replace(/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  if (path.startsWith('/admin/')) return;
  function send(event, referrer = '') {
    fetch('/api/analytics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, path, referrer }), keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  }
  let viewed = false;
  function view() {
    if (viewed || document.visibilityState !== 'visible') return;
    viewed = true;
    let referrer = '';
    try { referrer = new URL(document.referrer).origin; } catch (_) {}
    send('view', referrer);
  }
  view();
  document.addEventListener('visibilitychange', view);
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    let url;
    try { url = new URL(a.href); } catch (_) { return; }
    if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') send('whatsapp');
    else if (url.protocol === 'tel:') send('phone');
    else if (url.protocol === 'mailto:') send('email');
  });
})();
