(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hasIO = "IntersectionObserver" in window;
  var heroAnimated = false;

  function splitHero() {
    var title = document.querySelector(".hero__title");
    if (!title || !Abisal.i18n) return;
    var text = Abisal.i18n.t("hero.title");
    var words = text.split(/\s+/).filter(Boolean);
    var frag = document.createDocumentFragment();
    words.forEach(function (word, i) {
      var outer = document.createElement("span");
      outer.className = "word";
      outer.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "word__inner";
      inner.style.setProperty("--i", String(i));
      inner.textContent = word;
      outer.appendChild(inner);
      frag.appendChild(outer);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    title.setAttribute("aria-label", text);
    title.removeAttribute("data-i18n");
    title.textContent = "";
    title.appendChild(frag);
    var content = title.closest(".hero__content");
    if (content) content.style.setProperty("--words", String(words.length));
    if (heroAnimated) title.classList.add("is-static");
  }

  function startHero() {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      try {
        splitHero();
        root.classList.add("hero-ready");
        heroAnimated = true;
      } catch (e) {
        root.classList.add("hero-failed");
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(go, go);
      window.setTimeout(go, 1200);
    } else {
      go();
    }
    document.addEventListener("abisal:lang", function () {
      if (heroAnimated) splitHero();
    });
  }

  function belowFold(el) {
    return el.getBoundingClientRect().top > window.innerHeight * 0.92;
  }

  function onceVisible(elements, threshold, onEnter, rootMargin) {
    if (!hasIO) {
      elements.forEach(onEnter);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          onEnter(entry.target);
        }
      });
    }, { threshold: threshold, rootMargin: rootMargin || "0px 0px -8% 0px" });
    elements.forEach(function (el) {
      io.observe(el);
    });
  }

  function initReveals() {
    if (reduceMotion.matches || !hasIO) return;
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal")).filter(belowFold);
    items.forEach(function (el) {
      el.classList.add("is-pending");
    });
    onceVisible(items, 0.2, function (el) {
      el.classList.add("is-revealed");
      el.classList.remove("is-pending");
      window.setTimeout(function () {
        el.classList.remove("is-revealed");
      }, 900);
    });
  }

  function initInstructors() {
    var photos = Array.prototype.slice.call(document.querySelectorAll(".instructor__photo"));
    if (reduceMotion.matches || !hasIO) return;
    var pending = photos.filter(belowFold);
    pending.forEach(function (el, i) {
      el.classList.add("is-pending");
      el.querySelector("img").style.transitionDelay = (i % 3) * 120 + "ms";
    });
    onceVisible(pending, 0, function (el) {
      el.querySelector("img").loading = "eager";
    }, "600px 0px 600px 0px");
    onceVisible(pending, 0.25, function (el) {
      var img = el.querySelector("img");
      img.loading = "eager";
      var done = false;
      function reveal() {
        if (done) return;
        done = true;
        el.classList.add("is-revealed");
        el.classList.remove("is-pending");
      }
      if (img.complete && img.naturalWidth) {
        reveal();
      } else {
        if (img.decode) img.decode().then(reveal, reveal);
        img.addEventListener("load", reveal);
        img.addEventListener("error", reveal);
        window.setTimeout(reveal, 2500);
      }
    }, "0px 0px -6% 0px");
  }

  function renderDepthNumber(el, value) {
    var parts = Abisal.i18n.fmt.meterParts(value);
    var num = document.createElement("span");
    num.className = "location__num";
    num.textContent = parts.num;
    var unit = document.createElement("span");
    unit.className = "location__unit";
    unit.textContent = parts.unit;
    el.textContent = "";
    if (parts.unitFirst) {
      el.appendChild(unit);
      el.appendChild(num);
    } else {
      el.appendChild(num);
      el.appendChild(unit);
    }
    return num;
  }

  function initLocations() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".location"));
    var numbers = new Map();

    function renderAll() {
      cards.forEach(function (card) {
        var target = card.querySelector(".location__number");
        var max = Number(card.getAttribute("data-depth-max"));
        var numEl = renderDepthNumber(target, max);
        numbers.set(card, numEl);
      });
    }

    cards.forEach(function (card) {
      var max = Number(card.getAttribute("data-depth-max"));
      card.style.setProperty("--fill", String(Math.min(1, max / 30)));
    });
    renderAll();
    document.addEventListener("abisal:lang", renderAll);

    if (reduceMotion.matches || !hasIO) return;
    var pending = cards.filter(belowFold);
    pending.forEach(function (card) {
      card.classList.add("is-pending");
    });

    onceVisible(pending, 0.4, function (card) {
      var max = Number(card.getAttribute("data-depth-max"));
      var start = performance.now();
      var duration = 1000;
      var index = cards.indexOf(card);
      var delay = (index % 2) * 120;
      window.setTimeout(function () {
        card.classList.remove("is-pending");
        start = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - start) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          var numEl = numbers.get(card);
          if (numEl) numEl.textContent = Abisal.i18n.fmt.number(Math.round(max * eased));
          if (t < 1) window.requestAnimationFrame(tick);
        }
        var numEl = numbers.get(card);
        if (numEl) numEl.textContent = Abisal.i18n.fmt.number(0);
        window.requestAnimationFrame(tick);
      }, delay);
    });
  }

  function initRope() {
    var line = document.querySelector(".dive-line");
    if (!line || !Abisal.depth) return;
    var path = line.querySelector(".rope__line");
    var marker = line.querySelector(".rope__marker");
    var steps = Array.prototype.slice.call(line.querySelectorAll(".step"));
    var top = 0;
    var length = 0;
    var inset = 12;
    var stepOffsets = [];
    var reached = [];
    var lastProgress = -1;

    Abisal.depth.subscribe({
      measure: function () {
        var r = line.getBoundingClientRect();
        top = r.top + window.scrollY + inset;
        length = Math.max(1, r.height - inset * 2);
        stepOffsets = steps.map(function (step) {
          var node = step.querySelector(".step__node");
          var nr = node.getBoundingClientRect();
          return nr.top + nr.height / 2 - r.top - inset;
        });
        lastProgress = -1;
      },
      update: function (state) {
        var probe = state.y + state.vh * 0.62;
        var progress = Math.min(1, Math.max(0, (probe - top) / length));
        if (Math.abs(progress - lastProgress) < 0.0005) return;
        lastProgress = progress;
        path.style.strokeDashoffset = (100 - progress * 100).toFixed(3);
        marker.style.transform = "translate3d(0," + (progress * length).toFixed(2) + "px,0)";
        var px = progress * length + 2;
        steps.forEach(function (step, i) {
          var on = px >= stepOffsets[i];
          if (on !== reached[i]) {
            reached[i] = on;
            step.classList.toggle("is-reached", on);
          }
        });
      }
    });
  }

  function initHeroDepth() {
    var hero = document.querySelector(".hero");
    var img = document.querySelector(".hero__img");
    var rays = document.querySelector(".hero__rays");
    if (!hero || !Abisal.depth) return;
    var actions = hero.querySelector(".hero__actions");
    var heroH = 0;
    var settled = false;
    Abisal.depth.subscribe({
      measure: function (state) {
        var hr = hero.getBoundingClientRect();
        heroH = hr.height;
        if (actions) {
          var bottom = actions.getBoundingClientRect().bottom - hr.top;
          var bandTop = Math.max(bottom + 56, state.vh * 0.7);
          hero.style.setProperty("--band-top", Math.round(bandTop) + "px");
        }
        settled = false;
      },
      update: function (state) {
        if (state.y > heroH + 40) {
          if (!settled) {
            settled = true;
            if (rays) rays.style.opacity = "0";
            if (img) img.style.willChange = "auto";
          }
          return;
        }
        settled = false;
        if (img) {
          var hint = state.y > 0 && !reduceMotion.matches ? "transform" : "auto";
          if (img.style.willChange !== hint) img.style.willChange = hint;
        }
        if (img && !reduceMotion.matches) {
          img.style.transform = "translate3d(0," + (state.y * 0.16).toFixed(2) + "px,0)";
        }
        if (rays) rays.style.opacity = Math.max(0, 1 - state.depth / 2.2).toFixed(3);
      }
    });
  }

  function initParticles() {
    var canvas = document.querySelector(".particles");
    if (!canvas) return;
    if (reduceMotion.matches) {
      canvas.remove();
      return;
    }
    var ctx = null;
    try {
      ctx = canvas.getContext && canvas.getContext("2d");
    } catch (e) {
      ctx = null;
    }
    if (!ctx) {
      canvas.remove();
      return;
    }

    var BUBBLES = 20;
    var SNOW = 34;
    var w = 0;
    var h = 0;
    var dpr = 1;
    var bubbles = [];
    var snow = [];
    var running = false;
    var last = 0;
    var bubbleLevel = 0;
    var snowLevel = 0;
    var lastScroll = window.scrollY;
    var scrollDelta = 0;

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function makeBubble(initial) {
      return {
        x: rand(0.05, 0.95) * w,
        y: initial ? rand(0, h) : h + rand(10, 160),
        r: rand(1.4, 4.2),
        v: rand(16, 38),
        amp: rand(4, 12),
        freq: rand(0.6, 1.4),
        phase: rand(0, Math.PI * 2)
      };
    }

    function makeFlake(initial) {
      return {
        x: rand(0, w),
        y: initial ? rand(0, h) : rand(-40, -4),
        r: rand(0.5, 1.5),
        v: rand(4, 11),
        drift: rand(-4, 4),
        a: rand(0.25, 0.7)
      };
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bubbles = [];
      snow = [];
      for (var i = 0; i < BUBBLES; i++) bubbles.push(makeBubble(true));
      for (var j = 0; j < SNOW; j++) snow.push(makeFlake(true));
    }

    function draw(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      var shift = scrollDelta;
      scrollDelta = 0;
      ctx.clearRect(0, 0, w, h);
      if (bubbleLevel > 0.01) {
        for (var i = 0; i < bubbles.length; i++) {
          var b = bubbles[i];
          b.y -= b.v * dt + shift * 0.25;
          b.phase += b.freq * dt;
          if (b.y < -12) bubbles[i] = b = makeBubble(false);
          if (b.y > h + 200) b.y = h + rand(10, 160);
          var x = b.x + Math.sin(b.phase) * b.amp;
          ctx.beginPath();
          ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255," + (0.14 * bubbleLevel).toFixed(3) + ")";
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(255,255,255," + (0.7 * bubbleLevel).toFixed(3) + ")";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, Math.max(0.5, b.r * 0.28), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255," + (0.8 * bubbleLevel).toFixed(3) + ")";
          ctx.fill();
        }
      }
      if (snowLevel > 0.01) {
        for (var j = 0; j < snow.length; j++) {
          var f = snow[j];
          f.y += f.v * dt - shift * 0.15;
          f.x += f.drift * dt;
          if (f.y > h + 6 || f.y < -60) snow[j] = f = makeFlake(f.y > h);
          if (f.x < -4) f.x = w + 2;
          if (f.x > w + 4) f.x = -2;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(234,246,246," + (f.a * snowLevel).toFixed(3) + ")";
          ctx.fill();
        }
      }
      window.requestAnimationFrame(draw);
    }

    function shouldRun() {
      return !document.hidden && (bubbleLevel > 0.01 || snowLevel > 0.01);
    }

    function sync() {
      var run = shouldRun();
      if (run && !running) {
        running = true;
        last = performance.now();
        window.requestAnimationFrame(draw);
      } else if (!run && running) {
        running = false;
        ctx.clearRect(0, 0, w, h);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    Abisal.depth.subscribe({
      update: function (state) {
        bubbleLevel = Math.max(0, Math.min(1, 1 - state.depth / 5.5));
        snowLevel = Math.max(0, Math.min(1, (state.depth - 9) / 4));
        scrollDelta += state.y - lastScroll;
        lastScroll = state.y;
        sync();
      }
    });
  }

  function init() {
    startHero();
    initReveals();
    initInstructors();
    initLocations();
    initRope();
    initHeroDepth();
    initParticles();
  }

  Abisal.motion = { init: init };
})();
