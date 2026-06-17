// main.js — page interactions

(function () {
  'use strict';

  /* ─── Footer copyright year ────────────────────────────────────────────
     Keep the © year current without a redeploy. */
  document.querySelectorAll('[data-current-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ─── Save-the-Date modal ──────────────────────────────────────────────
     Any element with [data-modal-open="<id>"] opens that <dialog>.
     Elements with [data-modal-close], the Esc key, or a click on the
     backdrop close it. Falls back to the #register anchor if <dialog>
     isn't supported. */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      var dialog = document.getElementById(opener.getAttribute('data-modal-open'));
      if (dialog && typeof dialog.showModal === 'function') {
        e.preventDefault();
        dialog.showModal();
      }
      return;
    }

    if (e.target.closest('[data-modal-close]')) {
      var openDialog = e.target.closest('dialog');
      if (openDialog) { openDialog.close(); }
      return;
    }

    // Click on the backdrop (the dialog element itself, outside the panel)
    if (e.target.tagName === 'DIALOG') {
      e.target.close();
    }
  });

  /* ─── CTA email → modal ────────────────────────────────────────────────
     Submitting the CTA mini-form opens the Save-the-Date modal and
     pre-fills the Marketo email field with whatever was typed. */
  var ctaForm = document.getElementById('cta-form');
  if (ctaForm) {
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var input = document.getElementById('cta-email');
      var email = input ? input.value.trim() : '';

      var dialog = document.getElementById('sttd-modal');
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }

      if (email) { prefillEmail(email, 0); }
    });
  }

  /* Copy an email into the modal's Marketo form. Sets both Marketo's own
     model (vals) and the rendered input, and retries briefly in case the
     form finished loading just after the click. */
  function prefillEmail(email, attempt) {
    var applied = false;

    try {
      if (window.MktoForms2 && MktoForms2.allForms().length) {
        MktoForms2.allForms()[0].vals({ Email: email });
        applied = true;
      }
    } catch (err) { /* ignore */ }

    var el = document.querySelector('#mktoForm_8874 input[name="Email"], #mktoForm_8874 #Email');
    if (el) {
      el.value = email;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      applied = true;
    }

    if (!applied && attempt < 20) {
      setTimeout(function () { prefillEmail(email, attempt + 1); }, 150);
    }
  }

  /* ─── Testimonial carousel ─────────────────────────────────────────────
     Centers the active slide with dimmed, scaled-down neighbours peeking on
     both sides. Loops infinitely by cloning a full set of slides before and
     after the originals and snapping (without transition) whenever an
     animated move lands in the clone zone. Auto-advances on a timer; the
     active dot fills (CSS) to show time until the next slide. Pauses on
     hover/focus. Keyboard: ←/→. Falls back to a static, non-looping track
     when the user prefers reduced motion. */
  var AUTO_MS = 6000;

  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var viewport = root.querySelector('[data-carousel-viewport]');
    var track = root.querySelector('[data-carousel-track]');
    var dotsWrap = root.querySelector('[data-carousel-dots]');
    if (!viewport || !track || !track.children.length) { return; }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var originals = Array.prototype.slice.call(track.children);
    var N = originals.length;
    var loop = !reduce && N > 1;

    // Clone a full set before and after so a neighbour always peeks each side.
    // Both sets keep the originals' order: [s1..sN] real slides become
    // [s1..sN][s1..sN][s1..sN], so the slide left of the first real one is sN.
    if (loop) {
      var lead = document.createDocumentFragment();
      var trail = document.createDocumentFragment();
      originals.forEach(function (s) {
        var a = s.cloneNode(true);
        a.classList.add('is-clone');
        a.setAttribute('aria-hidden', 'true');
        lead.appendChild(a);
        var b = s.cloneNode(true);
        b.classList.add('is-clone');
        b.setAttribute('aria-hidden', 'true');
        trail.appendChild(b);
      });
      track.insertBefore(lead, track.firstChild);
      track.appendChild(trail);
    }

    var slides = Array.prototype.slice.call(track.children);
    var base = loop ? N : 0;   // index (in `slides`) of the first real slide
    var pos = base;            // currently centered slide
    var timer = null;

    function realIndex() { return ((pos - base) % N + N) % N; }

    // Pagination dots (one per real slide)
    var dots = originals.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quotes__dot quotes__dot--' + (i + 1); // fill matches the slide's gradient
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Show testimonial ' + (i + 1));
      b.addEventListener('click', function () { goTo(base + i, true); });
      dotsWrap.appendChild(b);
      return b;
    });

    // Clicking a neighbouring slide brings it to center.
    slides.forEach(function (s, i) {
      s.addEventListener('click', function () {
        if (i !== pos) { goTo(i, true); }
      });
    });

    function place() {
      var slideW = slides[0].getBoundingClientRect().width;
      var styles = getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;
      var vw = viewport.getBoundingClientRect().width;
      var offset = (vw / 2) - (slideW / 2) - pos * (slideW + gap);
      track.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
    }

    // Reposition + repaint instantly, with the track AND the slide/card
    // transitions suppressed (is-snapping). Used for the seamless loop-wrap
    // and for resize/load: without suppressing the card transition, the
    // newly-active card would re-run its scale-in animation after the jump.
    function jump() {
      track.classList.add('is-snapping');
      place();
      paint();
      track.getBoundingClientRect();          // commit the instant state
      track.classList.remove('is-snapping');
    }

    function paint() {
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === pos); });
      var active = realIndex();
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === active);
        d.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
    }

    function goTo(p, user) {
      pos = p;
      place();
      paint();
      if (user) { restart(); }
    }

    // After an animated move lands on a clone, jump to its real twin seamlessly.
    track.addEventListener('transitionend', function (e) {
      if (e.target !== track || e.propertyName !== 'transform' || !loop) { return; }
      if (pos >= base + N) { pos -= N; jump(); }
      else if (pos < base) { pos += N; jump(); }
    });

    function start() { if (!reduce && !timer && N > 1) { timer = setInterval(function () { goTo(pos + 1); }, AUTO_MS); } }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    // Pause only while the pointer is over a card or a dot (not the empty
    // space around them). Keeps the timer in sync with the CSS fill below.
    var hoverEls = Array.prototype.slice.call(track.querySelectorAll('.quote-card')).concat(dots);
    hoverEls.forEach(function (el) {
      el.addEventListener('mouseenter', stop);
      el.addEventListener('mouseleave', start);
    });
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { goTo(pos + 1, true); }
      else if (e.key === 'ArrowLeft') { goTo(pos - 1, true); }
    });

    window.addEventListener('resize', function () { jump(); });
    window.addEventListener('load', function () { jump(); }); // re-measure after fonts/images

    // Pause auto-advance while the tab is hidden, then re-sync on return.
    // The loop-wrap correction lives in the transitionend handler, and
    // transitions don't fire in a background tab — so a timer left running
    // there walks `pos` off the end of the slides without ever wrapping,
    // leaving the track parked off-screen (blank reel) when you come back.
    // Stopping the timer prevents the drift; snapping `pos` back to its real
    // index repairs any move that was mid-flight when the tab was hidden.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); return; }
      pos = base + realIndex();   // normalize out of the clone zone
      jump();
      start();
    });
    window.addEventListener('pageshow', function () { pos = base + realIndex(); jump(); });

    jump();
    start();
  });

  /* ─── Scroll reveal ────────────────────────────────────────────────────
     Reveals [data-reveal] elements (and the children of [data-reveal-children]
     groups, staggered) as they scroll into view. Gated on IntersectionObserver
     + motion preference: when either is absent we leave content visible by
     never adding the `.reveal-ready` class the CSS hidden states depend on. */
  (function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) { return; }

    document.documentElement.classList.add('reveal-ready');

    // Stagger each group's direct children via a per-child custom property.
    // A group can override the gap with data-reveal-children="<ms>".
    var STAGGER_MS = 90;
    document.querySelectorAll('[data-reveal-children]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-reveal-children'), 10) || STAGGER_MS;
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--reveal-delay', (i * step) + 'ms');
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal], [data-reveal-children]')
      .forEach(function (el) { io.observe(el); });
  })();
})();
