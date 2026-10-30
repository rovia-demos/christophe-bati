(() => {
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hauteur d'écran mesurée une fois ; recalculée seulement si la largeur change (rotation)
  let w = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === w) return;
    w = innerWidth;
    root.style.setProperty('--vh', innerHeight / 100 + 'px');
  });

  // En-tête
  const header = $('#header'), burger = $('#burger');
  const solid = () => header.classList.toggle('is-solid', scrollY > 40);
  solid();
  addEventListener('scroll', solid, { passive: true });
  const closeMenu = () => { header.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu'); };
  burger.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  $$('#nav a').forEach(a => a.addEventListener('click', closeMenu));
  d.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // Années de métier, toujours à jour
  const years = new Date().getFullYear() - 2008;
  $$('[data-years]').forEach(el => { el.textContent = years; });
  $('#year').textContent = new Date().getFullYear();

  // Compteurs
  const count = el => {
    const to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || 0), dec = +el.dataset.dec || 0;
    const fmt = v => v.toFixed(dec).replace('.', ',');
    if (calm) return;
    const t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Apparition au scroll
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    if (el.classList.contains('reveal')) el.classList.add('is-in');
    if (el.dataset.count) count(el);
    io.unobserve(el);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 70 + 'ms';
    io.observe(el);
  });
  $$('[data-count]').forEach(el => io.observe(el));

  // Avant / après : on fait glisser la « poutre »
  const beam = '<svg viewBox="0 0 26 40" aria-hidden="true"><path d="M3 3h20v5h-7.5v24H23v5H3v-5h7.5V8H3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  $$('.ba').forEach(ba => {
    ba.insertAdjacentHTML('beforeend', `<span class="ba__lbl ba__lbl--a">Avant</span><span class="ba__lbl ba__lbl--b">Après</span><span class="ba__handle"><span class="ba__knob">${beam}</span></span>`);
    let pos = 50, drag = false;
    const label = $('#' + ba.getAttribute('aria-labelledby')).querySelector('strong').textContent;
    ba.tabIndex = 0;
    ba.setAttribute('role', 'slider');
    ba.setAttribute('aria-label', `Comparer avant et après : ${label}`);
    ba.setAttribute('aria-valuemin', 0);
    ba.setAttribute('aria-valuemax', 100);
    const set = v => {
      pos = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', pos + '%');
      ba.setAttribute('aria-valuenow', Math.round(pos));
      ba.setAttribute('aria-valuetext', `${Math.round(pos)} % avant`);
    };
    const fromX = x => { const r = ba.getBoundingClientRect(); set((x - r.left) / r.width * 100); };
    ba.addEventListener('pointerdown', e => { drag = true; ba.setPointerCapture(e.pointerId); fromX(e.clientX); });
    ba.addEventListener('pointermove', e => { if (drag) fromX(e.clientX); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => ba.addEventListener(t, () => { drag = false; }));
    ba.addEventListener('keydown', e => {
      const k = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key];
      if (k) { e.preventDefault(); set(pos + k); }
      if (e.key === 'Home') { e.preventDefault(); set(0); }
      if (e.key === 'End') { e.preventDefault(); set(100); }
    });
    set(50);
  });
  // Les panneaux portent role=slider ; les onglets pointent vers eux
  const tabs = $$('.ap__tabs [role=tab]');
  const show = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', e => {
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault();
      const n = tabs[(i + k + tabs.length) % tabs.length];
      show(n); n.focus();
    });
  });

  // Galerie : filtres + « voir plus »
  const figs = $$('#gallery figure'), more = $('#more'), FIRST = 9;
  let filter = 'all', expanded = false;
  const paint = () => {
    let n = 0;
    figs.forEach(f => {
      const match = filter === 'all' || f.dataset.cat === filter;
      const visible = match && (expanded || filter !== 'all' || n < FIRST);
      if (match) n++;
      f.classList.toggle('is-hidden', !visible);
    });
    more.parentElement.hidden = expanded || filter !== 'all';
  };
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
    filter = b.dataset.f;
    paint();
  }));
  more.addEventListener('click', () => { expanded = true; paint(); });
  paint();

  // Visionneuse
  const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  let cur = 0;
  const visible = () => figs.filter(f => !f.classList.contains('is-hidden'));
  const open = i => {
    const list = visible(); cur = (i + list.length) % list.length;
    const img = $('img', list[cur]);
    const big = img.srcset ? img.srcset.split(',').pop().trim().split(' ')[0] : img.src;
    lbImg.src = big; lbImg.alt = img.alt; lbCap.textContent = $('figcaption', list[cur]).textContent;
    if (!lb.open) lb.showModal();
  };
  figs.forEach(f => $('.g__btn', f).addEventListener('click', () => open(visible().indexOf(f))));
  $('#lb-x').addEventListener('click', () => lb.close());
  $('#lb-p').addEventListener('click', () => open(cur - 1));
  $('#lb-n').addEventListener('click', () => open(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') open(cur - 1); if (e.key === 'ArrowRight') open(cur + 1); });

  // Carrousel d'avis
  const rv = $('#reviews');
  const step = dir => rv.scrollBy({ left: dir * ($('.rv', rv).offsetWidth + 18), behavior: calm ? 'auto' : 'smooth' });
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));

  // Raccourcis « votre projet » du haut de page -> formulaire pré-rempli
  $$('[data-type]').forEach(a => a.addEventListener('click', () => {
    const r = $(`.types input[value="${a.dataset.type}"]`);
    if (r) r.checked = true;
  }));

  // Formulaire (démo : confirmation affichée, aucun envoi)
  const form = $('#form'), err = $('#form-err'), ok = $('#form-ok'), file = $('#f-photo');
  file.addEventListener('change', () => { $('#file-name').textContent = file.files[0] ? file.files[0].name : ''; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const req = $$('[required]', form);
    req.forEach(f => f.setAttribute('aria-invalid', !f.value.trim()));
    const bad = req.find(f => !f.value.trim());
    err.hidden = !bad;
    if (bad) { bad.focus(); return; }
    ok.hidden = false;
    form.reset();
    $('#file-name').textContent = '';
    req.forEach(f => f.removeAttribute('aria-invalid'));
    ok.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  });

  // Barre d'appel mobile : visible une fois le haut de page dépassé
  const bar = $('.callbar');
  bar.classList.add('is-off');
  new IntersectionObserver(([en]) => bar.classList.toggle('is-off', en.isIntersecting), { rootMargin: '-30% 0px 0px 0px' }).observe($('.hero'));
})();
