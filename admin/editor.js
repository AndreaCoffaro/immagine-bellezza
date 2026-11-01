// Indice dei campi top-level: usa i label reali del CMS, senza modificare i dati React.
(() => {
  const label = document.getElementById('admin-field-jump-label');
  const select = document.getElementById('admin-field-jump');
  if (!label || !select) return;
  let targets = [];
  let signature = '';
  let scheduled = false;
  let observedRoot = null;
  function update() {
    scheduled = false;
    const root = document.getElementById('nc-root');
    if (root && observedRoot !== root) {
      observer.disconnect();
      observer.observe(root, { childList: true, subtree: true });
      observedRoot = root;
    }
    const pane = document.querySelector('#nc-root .e11hw0lx4');
    const fields = pane ? Array.from(pane.children).filter(el => el.matches('[class*="-ControlContainer"]')) : [];
    targets = fields.map(el => ({ element: el, name: el.querySelector('label')?.textContent.trim() })).filter(f => f.name);
    label.hidden = document.body.dataset.adminView !== 'editor' || !targets.length;
    const next = targets.map(f => f.name).join('\n');
    if (signature === next) return;
    signature = next;
    select.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = 'Scegli il campo…';
    select.append(first);
    targets.forEach((field, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = field.name;
      select.append(option);
    });
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  select.addEventListener('change', () => {
    if (select.value === '') return;
    const target = targets[Number(select.value)];
    if (!target) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.element.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    const input = target.element.querySelector('input:not([type="hidden"]),textarea,select,button,[tabindex="0"]');
    input?.focus({ preventScroll: true });
    select.value = '';
  });
  // Osserva l'arrivo iniziale del CMS, poi solo i suoi contenuti; niente polling di rete.
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  const viewObserver = new MutationObserver(schedule);
  viewObserver.observe(document.body, { attributes: true, attributeFilter: ['data-admin-view'] });
  window.addEventListener('hashchange', schedule);
  update();
})();
