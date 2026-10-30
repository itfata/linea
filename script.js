/* Linea — інтерактив. Без бібліотек. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.classList.remove('is-shown');
    toastEl.textContent = message;
    void toastEl.offsetWidth;
    toastEl.classList.add('is-shown');
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 3200);
  }

  /* ---------- шапка, прогрес, активний пункт меню ---------- */
  const header = $('[data-header]');
  const bar = $('.progress__bar');
  const navLinks = $$('.nav__list a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-top', y < hero.offsetHeight - header.offsetHeight);
    heroScroll(y);
    bandScroll();
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

    const probe = window.innerHeight * 0.35;
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= probe) current = s; });
    navLinks.forEach((a) => {
      const active = current && a.getAttribute('href') === `#${current.id}`;
      a.classList.toggle('is-active', !!active);
      if (active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    updateManifest();
    revealFallback();
  }

  // страховка, якщо IntersectionObserver спрацював із запізненням
  function revealFallback() {
    const limit = window.innerHeight * 0.92;
    $$('[data-reveal]:not(.is-in), .manifest__sign:not(.is-in)').forEach((el) => {
      if (el.getBoundingClientRect().top < limit) el.classList.add('is-in');
    });
  }

  /* ---------- мобільне меню ---------- */
  const burger = $('[data-burger]');
  const nav = $('[data-nav]');
  const burgerLabel = $('.visually-hidden', burger);

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burgerLabel.textContent = open ? 'Закрити меню' : 'Відкрити меню';
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) $('a', nav).focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- поява при скролі ---------- */
  const revealGroups = new Map();
  $$('[data-reveal]').forEach((el) => {
    const parent = el.parentElement;
    const idx = revealGroups.get(parent) || 0;
    revealGroups.set(parent, idx + 1);
    el.style.setProperty('--d', `${Math.min(idx, 5) * 0.08}s`);
  });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], .manifest__sign').forEach((el) => revealIO.observe(el));

  /* ---------- hero: старт, параллакс, лічильники ---------- */
  const hero = $('[data-hero]');
  void hero.offsetWidth;
  hero.classList.add('is-ready');

  // фото в hero: легкий зсув за курсором + повільніший скрол
  const heroImg = $('[data-parallax]', hero);
  let tx = 0, ty = 0, cx = 0, cy = 0, scrollShift = 0, raf = 0;
  const paintHero = () => {
    heroImg.style.transform = `translate3d(${(cx * -18).toFixed(2)}px, ${(cy * -14 + scrollShift).toFixed(2)}px, 0) scale(1.08)`;
  };
  const tick = () => {
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    paintHero();
    raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : 0;
  };
  if (finePointer) {
    hero.addEventListener('pointermove', (e) => {
      if (reduced()) return;
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }
  function heroScroll(y) {
    if (reduced()) return;
    scrollShift = Math.min(y, window.innerHeight) * 0.25;
    paintHero();
  }

  const counters = $$('[data-count]');
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countIO.unobserve(entry.target);
      const el = entry.target;
      const end = Number(el.dataset.count);
      if (reduced()) { el.textContent = end; return; }
      const dur = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => countIO.observe(el));

  /* ---------- широкий кадр: повільне наближення під час скролу ---------- */
  const band = $('[data-band]');
  const bandImg = $('[data-band-img]');
  function bandScroll() {
    if (reduced()) return;
    const r = band.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
    bandImg.style.transform = `scale(${(1.18 - p * 0.18).toFixed(4)}) translateY(${((p - 0.5) * -30).toFixed(1)}px)`;
  }

  /* ---------- маніфест: слова загораються ---------- */
  const manifest = $('[data-manifest]');
  const wordsHost = $('[data-words]');
  let words = [];
  (function splitWords(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          frag.appendChild(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitWords(child);
      }
    });
  })(wordsHost);
  words = $$('.w', wordsHost);

  function updateManifest() {
    if (!words.length) return;
    if (reduced()) { words.forEach((w) => w.classList.add('is-lit')); return; }
    const r = wordsHost.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.85;
    const end = vh * 0.35;
    const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }

  /* ---------- картки напрямів ---------- */
  $$('[data-card]').forEach((card) => {
    const btn = $('[data-card-toggle]', card);
    const panel = $('[data-card-panel]', card);
    const label = $('.visually-hidden', btn);
    const name = $('.card__title', card).textContent;
    let hideTimer;

    const set = (open) => {
      clearTimeout(hideTimer);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = `${open ? 'Згорнути' : 'Детальніше про'} ${name}`;
      if (open) {
        panel.hidden = false;
        void panel.offsetWidth; // фіксуємо стартовий стан перед переходом
        card.classList.add('is-open');
      } else {
        card.classList.remove('is-open');
        hideTimer = setTimeout(() => { panel.hidden = true; }, reduced() ? 0 : 700);
      }
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
  });

  // «Спробувати» з картки — одразу обирає напрям у формі
  const dirSelect = $('#f-dir');
  $$('[data-direction]').forEach((a) => {
    a.addEventListener('click', () => {
      dirSelect.value = a.dataset.direction;
      validateField(dirSelect);
    });
  });

  /* ---------- розклад ---------- */
  const DAYS = [
    { short: 'Пн', full: 'Понеділок' },
    { short: 'Вт', full: 'Вівторок' },
    { short: 'Ср', full: 'Середа' },
    { short: 'Чт', full: 'Четвер' },
    { short: 'Пт', full: 'Пʼятниця' },
    { short: 'Сб', full: 'Субота' },
    { short: 'Нд', full: 'Неділя' },
  ];
  const T = { d: 'Дарина Мельник', t: 'Тетяна Бондар', s: 'Софія Лисенко', i: 'Ірина Кравець' };
  const CAP = 6;
  // [час, напрям, тренер, рівень, зайнято]
  const PLAN = [
    [['07:30', 'Reformer', T.d, 'усі рівні', 4], ['10:00', 'Prenatal', T.s, 'м’яко', 2], ['18:30', 'Yoga Flow', T.t, 'середній', 5], ['20:00', 'Stretch & Release', T.t, 'усі рівні', 3]],
    [['08:00', 'Mat Pilates', T.s, 'початковий', 3], ['12:30', 'Reformer', T.i, 'середній', 6], ['19:00', 'Barre', T.i, 'інтенсив', 4]],
    [['07:30', 'Reformer', T.d, 'усі рівні', 5], ['11:00', 'Stretch & Release', T.t, 'усі рівні', 1], ['18:30', 'Mat Pilates', T.d, 'середній', 2], ['20:00', 'Yoga Flow', T.t, 'усі рівні', 4]],
    [['08:00', 'Barre', T.i, 'інтенсив', 3], ['10:00', 'Prenatal', T.s, 'м’яко', 4], ['19:00', 'Reformer', T.d, 'просунутий', 6]],
    [['07:30', 'Yoga Flow', T.t, 'усі рівні', 2], ['12:30', 'Mat Pilates', T.s, 'початковий', 3], ['18:00', 'Reformer', T.i, 'середній', 5], ['19:30', 'Stretch & Release', T.t, 'усі рівні', 4]],
    [['10:00', 'Reformer', T.d, 'усі рівні', 5], ['11:30', 'Barre', T.i, 'інтенсив', 3], ['13:00', 'Yoga Flow', T.t, 'усі рівні', 2]],
    [['10:00', 'Stretch & Release', T.t, 'усі рівні', 3], ['12:00', 'Mat Pilates', T.s, 'початковий', 1]],
  ].map((day) => day.map(([time, name, trainer, level, taken]) => ({ time, name, trainer, level, taken, booked: false })));

  const tabsEl = $('[data-tabs]');
  const panelEl = $('[data-tabpanel]');
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);

  const tabs = DAYS.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab';
    btn.id = `tab-${i}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'day-panel');
    btn.setAttribute('aria-label', `${d.full}, ${date.getDate()}${i === todayIdx ? ', сьогодні' : ''}`);
    btn.innerHTML = `<span class="tab__day" aria-hidden="true">${d.short}</span><span class="tab__date" aria-hidden="true">${date.getDate()}</span>${i === todayIdx ? '<span class="tab__today" aria-hidden="true"></span>' : ''}`;
    btn.addEventListener('click', () => selectDay(i));
    tabsEl.appendChild(btn);
    return btn;
  });
  panelEl.id = 'day-panel';

  tabsEl.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % 7;
    if (e.key === 'ArrowLeft') next = (i + 6) % 7;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = 6;
    if (next === null) return;
    e.preventDefault();
    selectDay(next);
    tabs[next].focus();
  });

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function btnState(slot) {
    if (slot.booked) return { text: 'Ви записані', icon: checkIcon, pressed: 'true' };
    if (slot.taken >= CAP) return { text: 'Лист очікування', icon: '', pressed: 'false' };
    return { text: 'Записатися', icon: '', pressed: 'false' };
  }

  function slotHTML(slot, i) {
    const free = CAP - slot.taken;
    const st = btnState(slot);
    return `<li class="slot">
      <p class="slot__time">${slot.time}</p>
      <div class="slot__info">
        <p class="slot__name">${esc(slot.name)}</p>
        <p class="slot__sub"><span>${esc(slot.trainer)}</span><span>${esc(slot.level)}</span><span>${free > 0 ? `вільно ${free} з ${CAP}` : 'місць немає'}</span></p>
      </div>
      <button class="btn ${slot.booked ? 'btn--accent' : 'btn--outline-ink'} slot__btn" type="button" data-slot="${i}" aria-pressed="${st.pressed}"
        aria-label="${st.text}: ${esc(slot.name)}, ${slot.time}">${st.icon}<span>${st.text}</span></button>
    </li>`;
  }

  let currentDay = todayIdx;
  function selectDay(i) {
    currentDay = i;
    tabs.forEach((t, k) => {
      const sel = k === i;
      t.setAttribute('aria-selected', String(sel));
      t.tabIndex = sel ? 0 : -1;
    });
    panelEl.setAttribute('aria-labelledby', tabs[i].id);
    const list = PLAN[i];
    panelEl.innerHTML = list.length
      ? `<ul class="slots">${list.map(slotHTML).join('')}</ul>`
      : '<p class="slots__empty">У цей день студія відпочиває.</p>';
  }

  panelEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-slot]');
    if (!btn || btn.classList.contains('is-loading')) return;
    const slot = PLAN[currentDay][Number(btn.dataset.slot)];
    const day = DAYS[currentDay].full.toLowerCase();
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');

    setTimeout(() => {
      let msg;
      if (slot.booked) {
        slot.booked = false;
        slot.taken -= 1;
        msg = `Запис на ${slot.name} скасовано`;
      } else if (slot.taken >= CAP) {
        msg = `Ви в листі очікування на ${slot.name}, ${day} ${slot.time}`;
      } else {
        slot.booked = true;
        slot.taken += 1;
        msg = `Готово! ${slot.name}, ${day} о ${slot.time}`;
      }
      const li = btn.closest('.slot');
      const tmp = document.createElement('ul');
      tmp.innerHTML = slotHTML(slot, Number(btn.dataset.slot));
      const fresh = tmp.firstElementChild;
      fresh.style.animation = 'none';
      li.replaceWith(fresh);
      $('[data-slot]', fresh).focus();
      toast(msg);
    }, reduced() ? 0 : 450);
  });

  selectDay(todayIdx);

  /* ---------- форма пробного ---------- */
  const form = $('[data-form]');
  const success = $('[data-success]');
  const fields = {
    name: $('#f-name'),
    phone: $('#f-phone'),
    direction: dirSelect,
  };

  const phoneDigits = (v) => v.replace(/\D/g, '');
  function formatPhone(v) {
    let d = phoneDigits(v);
    if (d.startsWith('0')) d = `38${d}`;
    if (d && !d.startsWith('380')) d = `380${d}`.slice(0, 12);
    d = d.slice(0, 12);
    const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
    return p.length ? `+${p.join(' ')}` : '';
  }

  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Вкажіть, будь ласка, ім’я — хоча б дві літери.' : ''),
    phone: (v) => (phoneDigits(v).length !== 12 ? 'Номер має містити 12 цифр, наприклад +380 67 123 45 67.' : ''),
    direction: (v) => (!v ? 'Оберіть напрям — або «Ще не знаю».' : ''),
  };

  function validateField(input) {
    const msg = rules[input.name](input.value);
    const err = $(`#${input.getAttribute('aria-describedby')}`);
    err.textContent = msg;
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }

  Object.values(fields).forEach((input) => {
    input.addEventListener('blur', () => { if (input.value) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });
  fields.direction.addEventListener('change', () => validateField(fields.direction));
  fields.phone.addEventListener('input', () => {
    const before = fields.phone.value;
    const formatted = formatPhone(before);
    if (formatted !== before) fields.phone.value = formatted;
  });
  fields.phone.addEventListener('focus', () => { if (!fields.phone.value) fields.phone.value = '+380 '; });
  fields.phone.addEventListener('blur', () => { if (phoneDigits(fields.phone.value) === '380') fields.phone.value = ''; });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const results = Object.values(fields).map(validateField);
    const firstBad = Object.values(fields).find((_, i) => !results[i]);
    if (firstBad) { firstBad.focus(); return; }

    $('[data-success-title]').textContent = `Дякуємо, ${fields.name.value.trim().split(' ')[0]}!`;
    form.hidden = true;
    success.hidden = false;
    void success.offsetWidth;
    success.classList.add('is-shown');
    success.focus();
    toast('Заявку прийнято — чекайте на дзвінок');
  });

  $('[data-reset]').addEventListener('click', () => {
    form.reset();
    Object.values(fields).forEach((f) => f.removeAttribute('aria-invalid'));
    $$('.field__error', form).forEach((el) => { el.textContent = ''; });
    success.classList.remove('is-shown');
    success.hidden = true;
    form.hidden = false;
    fields.name.focus();
  });

  /* ---------- магнітні кнопки ---------- */
  if (finePointer) {
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (reduced()) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- старт ---------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
