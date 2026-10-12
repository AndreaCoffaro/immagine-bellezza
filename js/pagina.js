/* =========================================================================
   Script delle pagine dei trattamenti e del blog (generate da prerender.py).
   I contenuti sono già scritti nella pagina: qui servono solo menu mobile,
   link WhatsApp con messaggio, barra in alto e anno nel footer.
   ========================================================================= */
(() => {
  const $ = s => document.querySelector(s);
  const WHATSAPP = (($('a[href^="https://wa.me/"]')?.href || "").match(/wa\.me\/(\d+)/) || [])[1] || "393470096504";

  document.querySelectorAll("[data-wa]").forEach(a => {
    a.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(a.dataset.wa)}`;
    a.target = "_blank";
    a.rel = "noopener";
  });

  const anno = $("#anno");
  if(anno) anno.textContent = new Date().getFullYear();

  const header = $("header.site");
  const float = $(".wa-float");
  const onScroll = () => {
    header?.classList.toggle("scrolled", scrollY > 8);
    float?.classList.toggle("show", scrollY > 480);
  };
  addEventListener("scroll", onScroll, { passive:true });
  onScroll();

  // menu mobile (come nella home)
  const toggle = $(".nav-toggle"), nav = $("nav.main");
  if(!toggle || !nav) return;
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
})();
