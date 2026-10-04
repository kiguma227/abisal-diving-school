(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var MAX_DEPTH = 18;
  var subscribers = [];
  var anchors = [];
  var docHeight = 0;
  var viewH = 0;
  var maxScroll = 1;
  var ticking = false;
  var lastY = 0;
  var lastText = "";
  var headerHidden = false;
  var activeId = null;
  var railHeight = 0;
  var observers = [];

  var state = { y: 0, vh: 0, depth: 0, progress: 0, direction: 0 };

  var els = {};

  function subscribe(handler) {
    subscribers.push(handler);
    if (handler.measure) handler.measure(state);
    if (handler.update) handler.update(state);
  }

  function measure() {
    viewH = window.innerHeight;
    docHeight = document.documentElement.scrollHeight;
    maxScroll = Math.max(1, docHeight - viewH);
    var y = window.scrollY;
    anchors = [];
    els.zones.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      anchors.push({ top: rect.top + y, depth: Number(el.getAttribute("data-depth")), id: el.id });
    });
    anchors.push({ top: docHeight, depth: MAX_DEPTH, id: null });
    railHeight = els.railScale ? els.railScale.clientHeight : 0;
    state.vh = viewH;
    subscribers.forEach(function (s) {
      if (s.measure) s.measure(state);
    });
    rebuildObservers();
  }

  function depthAt(probe) {
    if (!anchors.length) return 0;
    if (probe <= anchors[0].top) return anchors[0].depth;
    for (var i = 0; i < anchors.length - 1; i++) {
      var a = anchors[i];
      var b = anchors[i + 1];
      if (probe >= a.top && probe <= b.top) {
        var span = b.top - a.top;
        var t = span > 0 ? (probe - a.top) / span : 0;
        return a.depth + (b.depth - a.depth) * t;
      }
    }
    return MAX_DEPTH;
  }

  function sectionAt(probe) {
    var id = null;
    for (var i = 0; i < anchors.length - 1; i++) {
      if (probe >= anchors[i].top) id = anchors[i].id;
    }
    return id;
  }

  function renderIndicator(depth) {
    var text = Abisal.i18n ? Abisal.i18n.fmt.meter(depth, 1) : depth.toFixed(1) + " m";
    if (text !== lastText) {
      lastText = text;
      els.values.forEach(function (v) {
        v.textContent = text;
      });
    }
    if (els.marker) {
      els.marker.style.setProperty("--marker-y", ((depth / MAX_DEPTH) * railHeight).toFixed(2) + "px");
    }
  }

  function headerShouldStay() {
    var header = els.header;
    if (!header) return true;
    if (header.classList.contains("menu-open")) return true;
    if (header.contains(document.activeElement) && document.activeElement !== document.body) return true;
    return false;
  }

  function renderHeader(y, dy) {
    var hide = headerHidden;
    if (y < 96 || headerShouldStay()) hide = false;
    else if (dy > 6) hide = true;
    else if (dy < -6) hide = false;
    if (hide !== headerHidden) {
      headerHidden = hide;
      els.header.classList.toggle("is-hidden", hide);
    }
  }

  function frame() {
    ticking = false;
    var y = window.scrollY;
    var dy = y - lastY;
    var progress = Math.min(1, Math.max(0, y / maxScroll));
    var probe = y + viewH * progress;
    var depth = Math.min(MAX_DEPTH, Math.max(0, depthAt(probe)));
    state.y = y;
    state.progress = progress;
    state.depth = depth;
    state.direction = dy === 0 ? state.direction : dy > 0 ? 1 : -1;
    renderIndicator(depth);
    if (els.header) renderHeader(y, dy);
    var active = sectionAt(y + viewH * 0.38);
    if (active !== activeId) {
      activeId = active;
      document.dispatchEvent(new CustomEvent("abisal:section", { detail: { id: active } }));
    }
    subscribers.forEach(function (s) {
      if (s.update) s.update(state);
    });
    lastY = y;
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  function onScroll() {
    request();
  }

  function bandObserver(targets, offset, onChange) {
    if (!("IntersectionObserver" in window)) return null;
    var top = Math.max(0, Math.round(offset));
    var bottom = Math.max(0, Math.round(viewH - offset - 2));
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      });
      var pick = null;
      targets.forEach(function (el) {
        if (visible.has(el)) pick = el;
      });
      if (pick) onChange(pick);
    }, { rootMargin: "-" + top + "px 0px -" + bottom + "px 0px", threshold: 0 });
    targets.forEach(function (el) {
      io.observe(el);
    });
    return io;
  }

  function setInk(el, ink) {
    if (el && ink && el.getAttribute("data-ink") !== ink) el.setAttribute("data-ink", ink);
  }

  function rebuildObservers() {
    observers.forEach(function (o) {
      if (o) o.disconnect();
    });
    observers = [];
    var targets = els.inkTargets;
    if (!targets.length) return;
    var headerBand = els.capsule ? Math.min(60, els.capsule.offsetHeight / 2 + 14) : 44;
    observers.push(bandObserver(targets, headerBand, function (el) {
      setInk(els.header, el.getAttribute("data-ink"));
    }));
    observers.push(bandObserver(targets, viewH / 2, function (el) {
      setInk(els.rail, el.getAttribute("data-ink"));
    }));
    observers.push(bandObserver(targets, viewH - 32, function (el) {
      setInk(els.capsuleDepth, el.getAttribute("data-ink"));
      if (els.capsuleDepth) {
        var hide = el.id === "booking" || el.classList.contains("site-footer");
        els.capsuleDepth.classList.toggle("is-hidden", hide);
      }
    }));
  }

  var measureQueued = false;
  function queueMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    window.requestAnimationFrame(function () {
      measureQueued = false;
      measure();
      request();
    });
  }

  function init() {
    els.zones = Array.prototype.slice.call(document.querySelectorAll("main [data-depth]"));
    els.header = document.querySelector(".site-header");
    els.capsule = document.querySelector(".capsule");
    els.rail = document.querySelector(".depth-rail");
    els.railScale = document.querySelector(".depth-rail__scale");
    els.marker = document.querySelector(".depth-rail__marker");
    els.capsuleDepth = document.querySelector(".depth-capsule");
    els.values = Array.prototype.slice.call(document.querySelectorAll("[data-depth-value]"));
    els.inkTargets = Array.prototype.slice.call(document.querySelectorAll("main [data-ink], .thermocline [data-ink], .site-footer[data-ink]"));

    measure();
    lastY = window.scrollY;
    frame();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", queueMeasure);
    window.addEventListener("load", queueMeasure);
    document.addEventListener("abisal:lang", function () {
      lastText = "";
      queueMeasure();
    });
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(queueMeasure);
      ro.observe(document.querySelector("main"));
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(queueMeasure);
    }
    if (els.header) {
      els.header.addEventListener("focusin", function () {
        if (headerHidden) {
          headerHidden = false;
          els.header.classList.remove("is-hidden");
        }
      });
    }
  }

  Abisal.depth = {
    init: init,
    subscribe: subscribe,
    measure: queueMeasure,
    request: request,
    get state() {
      return state;
    },
    get activeSection() {
      return activeId;
    },
    MAX_DEPTH: MAX_DEPTH
  };
})();
