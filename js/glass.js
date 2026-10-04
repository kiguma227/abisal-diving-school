(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var SVG_NS = "http://www.w3.org/2000/svg";
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function enhanceButtons() {
    document.querySelectorAll(".btn").forEach(function (btn) {
      if (btn.querySelector(".btn__sheen")) return;
      var sheen = document.createElement("span");
      sheen.className = "btn__sheen";
      sheen.setAttribute("aria-hidden", "true");
      btn.insertBefore(sheen, btn.firstChild);
    });
  }

  var tracked = null;
  var rect = null;
  var target = { x: 0, y: 0 };
  var pos = { x: 0, y: 0 };
  var rafId = 0;

  function step() {
    rafId = 0;
    if (!tracked) return;
    pos.x += (target.x - pos.x) * 0.22;
    pos.y += (target.y - pos.y) * 0.22;
    tracked.style.setProperty("--mx", pos.x.toFixed(1) + "px");
    tracked.style.setProperty("--my", pos.y.toFixed(1) + "px");
    if (Math.abs(target.x - pos.x) > 0.3 || Math.abs(target.y - pos.y) > 0.3) {
      rafId = window.requestAnimationFrame(step);
    }
  }

  function track(el, e, entering) {
    if (entering || el !== tracked) {
      tracked = el;
      rect = el.getBoundingClientRect();
      pos.x = e.clientX - rect.left;
      pos.y = e.clientY - rect.top;
    }
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
    if (!rafId) rafId = window.requestAnimationFrame(step);
  }

  function initPointerLight() {
    var selector = ".btn, .course";
    document.addEventListener("pointerover", function (e) {
      if (e.pointerType !== "mouse" || !finePointer.matches || reduceMotion.matches) return;
      var el = e.target.closest(selector);
      if (el && el !== tracked) track(el, e, true);
    });
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !finePointer.matches || reduceMotion.matches) return;
      var el = e.target.closest(selector);
      if (!el) {
        tracked = null;
        return;
      }
      track(el, e, el !== tracked);
    }, { passive: true });
    if (Abisal.depth) {
      Abisal.depth.subscribe({
        update: function () {
          tracked = null;
        }
      });
    }
  }

  function initRipple() {
    document.addEventListener("pointerdown", function (e) {
      if (reduceMotion.matches || e.button !== 0) return;
      var btn = e.target.closest(".btn");
      if (!btn || btn.disabled) return;
      var r = btn.getBoundingClientRect();
      var old = btn.querySelector(".btn__ripple");
      if (old) old.remove();
      var ripple = document.createElement("span");
      ripple.className = "btn__ripple";
      ripple.setAttribute("aria-hidden", "true");
      var size = Math.max(r.width, r.height) * 2.2;
      ripple.style.setProperty("--rx", (e.clientX - r.left) + "px");
      ripple.style.setProperty("--ry", (e.clientY - r.top) + "px");
      ripple.style.setProperty("--rs", size + "px");
      ripple.addEventListener("animationend", function () {
        ripple.remove();
      });
      btn.appendChild(ripple);
    });
  }

  function makeDrop(container, drop) {
    var visible = false;
    var moveTimer = 0;
    return function move(el) {
      if (!el) {
        drop.classList.remove("is-visible");
        visible = false;
        return;
      }
      var cr = container.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      if (!r.width) return;
      var x = r.left - cr.left;
      var y = r.top - cr.top;
      var prevX = parseFloat(drop.style.getPropertyValue("--drop-x")) || 0;
      if (!visible) {
        drop.classList.add("is-instant");
      }
      drop.style.setProperty("--drop-x", x.toFixed(2) + "px");
      drop.style.setProperty("--drop-y", y.toFixed(2) + "px");
      drop.style.setProperty("--drop-w", r.width.toFixed(2) + "px");
      drop.style.setProperty("--drop-h", r.height.toFixed(2) + "px");
      if (!visible) {
        void drop.offsetWidth;
        drop.classList.remove("is-instant");
        drop.classList.add("is-visible");
        visible = true;
        return;
      }
      if (Math.abs(prevX - x) > 1 && !reduceMotion.matches) {
        drop.classList.add("is-moving");
        window.clearTimeout(moveTimer);
        moveTimer = window.setTimeout(function () {
          drop.classList.remove("is-moving");
        }, 240);
      }
    };
  }

  function initNavDrop() {
    var nav = document.querySelector(".nav");
    var drop = document.querySelector(".nav__drop");
    if (!nav || !drop) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll(".nav__link"));
    var move = makeDrop(nav, drop);
    var active = null;
    var hovering = null;

    function rest() {
      move(hovering || active);
    }

    links.forEach(function (link) {
      link.addEventListener("pointerenter", function () {
        hovering = link;
        move(link);
      });
      link.addEventListener("focus", function () {
        if (link.matches(":focus-visible")) {
          hovering = link;
          move(link);
        }
      });
      link.addEventListener("blur", function () {
        if (hovering === link) hovering = null;
        window.requestAnimationFrame(rest);
      });
    });
    nav.addEventListener("pointerleave", function () {
      hovering = null;
      rest();
    });

    document.addEventListener("abisal:section", function (e) {
      var id = e.detail.id;
      active = null;
      links.forEach(function (l) {
        var match = id && l.getAttribute("href") === "#" + id;
        if (match) {
          active = l;
          l.setAttribute("aria-current", "true");
        } else {
          l.removeAttribute("aria-current");
        }
      });
      document.querySelectorAll(".menu-panel__link").forEach(function (l) {
        if (id && l.getAttribute("href") === "#" + id) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
      if (!hovering) rest();
    });

    var list = nav.querySelector(".nav__list");
    function sizeList() {
      if (!Abisal.i18n || !list) return;
      list.style.minWidth = "";
      var probe = list.cloneNode(true);
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;min-width:0;width:max-content;";
      nav.appendChild(probe);
      var widest = 0;
      Abisal.i18n.supported.forEach(function (lang) {
        probe.querySelectorAll("[data-i18n]").forEach(function (el) {
          el.textContent = Abisal.i18n.t(el.getAttribute("data-i18n"), null, lang);
        });
        widest = Math.max(widest, probe.getBoundingClientRect().width);
      });
      nav.removeChild(probe);
      list.style.minWidth = Math.ceil(widest) + "px";
    }

    function remeasure() {
      sizeList();
      drop.classList.add("is-instant");
      rest();
      window.requestAnimationFrame(function () {
        drop.classList.remove("is-instant");
      });
    }
    window.addEventListener("resize", remeasure);
    document.addEventListener("abisal:lang", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    sizeList();
  }

  function initLangDrop() {
    var lang = document.querySelector(".lang");
    var drop = document.querySelector(".lang__drop");
    if (!lang || !drop) return;
    var move = makeDrop(lang, drop);
    function update() {
      move(lang.querySelector('[aria-pressed="true"]'));
    }
    document.addEventListener("abisal:lang", update);
    window.addEventListener("resize", function () {
      drop.classList.add("is-instant");
      update();
      window.requestAnimationFrame(function () {
        drop.classList.remove("is-instant");
      });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    update();
  }

  function initMenu() {
    var header = document.querySelector(".site-header");
    var toggle = document.querySelector(".menu-toggle");
    var panel = document.getElementById("menu-panel");
    if (!header || !toggle || !panel) return;
    var label = toggle.querySelector(".sr-only");
    var closeTimer = 0;

    function setLabel(open) {
      if (!label || !Abisal.i18n) return;
      label.setAttribute("data-i18n", open ? "header.menuClose" : "header.menu");
      label.textContent = Abisal.i18n.t(open ? "header.menuClose" : "header.menu");
    }

    function open() {
      window.clearTimeout(closeTimer);
      panel.hidden = false;
      header.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
      setLabel(true);
      window.requestAnimationFrame(function () {
        panel.classList.add("is-open");
      });
      var first = panel.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }

    function close(returnFocus) {
      if (panel.hidden) return;
      panel.classList.remove("is-open");
      header.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      setLabel(false);
      closeTimer = window.setTimeout(function () {
        panel.hidden = true;
      }, reduceMotion.matches ? 0 : 320);
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener("click", function () {
      if (toggle.getAttribute("aria-expanded") === "true") close(false);
      else open();
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") close(true);
    });
    document.addEventListener("pointerdown", function (e) {
      if (toggle.getAttribute("aria-expanded") === "true" && !header.contains(e.target)) close(false);
    });
    window.matchMedia("(min-width: 1200px)").addEventListener("change", function (e) {
      if (e.matches) close(false);
    });
  }

  function supportsRefraction() {
    if (typeof window.SVGFEDisplacementMapElement === "undefined") return false;
    if (!window.CSS || !CSS.supports) return false;
    return CSS.supports("backdrop-filter", "url(#a)") || CSS.supports("-webkit-backdrop-filter", "url(#a)");
  }

  function displacementMap(w, h, ring) {
    var edge = ring * 0.5;
    var inner = Math.max(0, h / 2 - edge);
    var blur = ring * 0.18;
    var svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + " " + h + "'>" +
      "<defs>" +
      "<linearGradient id='x' x1='0' x2='1' y1='0' y2='0'><stop offset='0' stop-color='#ff0000'/><stop offset='1' stop-color='#000000'/></linearGradient>" +
      "<linearGradient id='y' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='#00ff00'/><stop offset='1' stop-color='#000000'/></linearGradient>" +
      "<filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='" + blur.toFixed(2) + "'/></filter>" +
      "</defs>" +
      "<rect width='" + w + "' height='" + h + "' fill='#000000'/>" +
      "<rect width='" + w + "' height='" + h + "' fill='url(#x)'/>" +
      "<rect width='" + w + "' height='" + h + "' fill='url(#y)' style='mix-blend-mode:screen'/>" +
      "<rect x='" + edge + "' y='" + edge + "' width='" + Math.max(0, w - edge * 2) + "' height='" + Math.max(0, h - edge * 2) + "' rx='" + inner + "' fill='#808080' filter='url(#b)'/>" +
      "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function initRefraction() {
    var targets = document.querySelectorAll("[data-refract]");
    if (!targets.length) return;
    if (!supportsRefraction()) {
      document.documentElement.classList.add("no-refraction");
      return;
    }
    var defs = document.getElementById("svg-defs");
    if (!defs) return;
    var scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--glass-refraction-scale")) || 9;

    targets.forEach(function (btn, index) {
      var id = "glass-refract-" + index;
      var host = document.createElement("span");
      host.className = "refract-host";
      btn.parentNode.insertBefore(host, btn);
      host.appendChild(btn);
      var layer = document.createElement("span");
      layer.className = "refract-layer";
      layer.setAttribute("aria-hidden", "true");
      host.appendChild(layer);

      var filter = document.createElementNS(SVG_NS, "filter");
      filter.setAttribute("id", id);
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("primitiveUnits", "userSpaceOnUse");
      filter.setAttribute("color-interpolation-filters", "sRGB");
      var img = document.createElementNS(SVG_NS, "feImage");
      img.setAttribute("result", "map");
      img.setAttribute("preserveAspectRatio", "none");
      var disp = document.createElementNS(SVG_NS, "feDisplacementMap");
      disp.setAttribute("in", "SourceGraphic");
      disp.setAttribute("in2", "map");
      disp.setAttribute("scale", String(scale));
      disp.setAttribute("xChannelSelector", "R");
      disp.setAttribute("yChannelSelector", "G");
      filter.appendChild(img);
      filter.appendChild(disp);
      defs.appendChild(filter);

      var lastKey = "";
      function size() {
        var w = Math.round(btn.offsetWidth);
        var h = Math.round(btn.offsetHeight);
        if (!w || !h) return;
        var key = w + "x" + h;
        if (key === lastKey) return;
        lastKey = key;
        ["x", "y"].forEach(function (a) {
          filter.setAttribute(a, "0");
          img.setAttribute(a, "0");
        });
        filter.setAttribute("width", String(w));
        filter.setAttribute("height", String(h));
        img.setAttribute("width", String(w));
        img.setAttribute("height", String(h));
        var e = Math.max(6, Math.min(12, h * 0.22));
        img.setAttribute("href", displacementMap(w, h, e));
        var r = h / 2;
        var ri = r - e;
        var ring = "M" + r + ",0 H" + (w - r) + " A" + r + "," + r + " 0 0 1 " + (w - r) + "," + h + " H" + r + " A" + r + "," + r + " 0 0 1 " + r + ",0 Z " +
          "M" + r + "," + e + " H" + (w - r) + " A" + ri + "," + ri + " 0 0 1 " + (w - r) + "," + (h - e) + " H" + r + " A" + ri + "," + ri + " 0 0 1 " + r + "," + e + " Z";
        var feather = (e * 0.3).toFixed(2);
        var maskSvg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + " " + h + "'>" +
          "<filter id='f' x='-10%' y='-30%' width='120%' height='160%'><feGaussianBlur stdDeviation='" + feather + "'/></filter>" +
          "<path fill='#fff' fill-rule='evenodd' filter='url(#f)' d='" + ring + "'/></svg>";
        var maskUrl = "url(\"data:image/svg+xml," + encodeURIComponent(maskSvg) + "\")";
        layer.style.setProperty("-webkit-mask-image", maskUrl);
        layer.style.setProperty("mask-image", maskUrl);
        layer.style.setProperty("-webkit-mask-size", "100% 100%");
        layer.style.setProperty("mask-size", "100% 100%");
        layer.style.setProperty("-webkit-backdrop-filter", "url(#" + id + ")");
        layer.style.setProperty("backdrop-filter", "url(#" + id + ")");
      }
      size();
      if ("ResizeObserver" in window) new ResizeObserver(size).observe(btn);
      else window.addEventListener("resize", size);

      btn.addEventListener("pointerenter", function () {
        layer.style.setProperty("--btn-scale", finePointer.matches && !reduceMotion.matches ? "1.02" : "1");
      });
      btn.addEventListener("pointerleave", function () {
        layer.style.setProperty("--btn-scale", "1");
      });
      btn.addEventListener("pointerdown", function () {
        layer.style.setProperty("--btn-scale", reduceMotion.matches ? "1" : "0.97");
      });
      btn.addEventListener("pointerup", function () {
        layer.style.setProperty("--btn-scale", finePointer.matches && !reduceMotion.matches ? "1.02" : "1");
      });
    });
    document.documentElement.classList.add("has-refraction");
  }

  function detectGlass() {
    var ok = window.CSS && CSS.supports && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
    if (!ok) document.documentElement.classList.add("no-glass");
  }

  function init() {
    detectGlass();
    enhanceButtons();
    initPointerLight();
    initRipple();
    initNavDrop();
    initLangDrop();
    initMenu();
    initRefraction();
  }

  Abisal.glass = { init: init, enhanceButtons: enhanceButtons };
})();
