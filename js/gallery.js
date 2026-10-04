(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  var DURATION = 480;

  var box, img, caption, counter, stage, thumbs, origin;
  var index = 0;
  var isOpen = false;
  var busy = false;
  var swipe = null;
  var outside = [];

  function radiusOf(el) {
    return parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  }

  function thumbImage(i) {
    return thumbs[i].querySelector("img");
  }

  function describe(i) {
    var alt = thumbImage(i).getAttribute("alt") || "";
    img.setAttribute("alt", alt);
    caption.textContent = alt;
    counter.textContent = Abisal.i18n ? Abisal.i18n.fmt.counter(i + 1, thumbs.length) : (i + 1) + " / " + thumbs.length;
  }

  function fit(i) {
    var t = thumbs[i];
    var natW = Number(t.getAttribute("data-w"));
    var natH = Number(t.getAttribute("data-h"));
    var ratio = natW / natH;
    var styles = getComputedStyle(stage);
    var availW = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    var reserved = window.innerWidth < 768 ? 150 : 180;
    var availH = Math.max(160, window.innerHeight - reserved);
    var w = Math.min(natW, availW, availH * ratio);
    img.style.width = Math.round(w) + "px";
    img.style.height = Math.round(w / ratio) + "px";
  }

  function load(i) {
    var t = thumbs[i];
    var small = thumbImage(i);
    img.width = Number(t.getAttribute("data-w"));
    img.height = Number(t.getAttribute("data-h"));
    fit(i);
    img.src = small.currentSrc || small.src;
    describe(i);
    var full = new Image();
    var src = t.getAttribute("data-full");
    full.onload = function () {
      if (index === i && isOpen) img.src = src;
    };
    full.onerror = function () {
      return null;
    };
    full.src = src;
  }

  function flipFrom(rect, reverse) {
    var last = img.getBoundingClientRect();
    if (!rect || !last.width || !rect.width) return null;
    var s = Math.max(rect.width / last.width, rect.height / last.height);
    var tx = rect.left + rect.width / 2 - (last.left + (last.width * s) / 2);
    var ty = rect.top + rect.height / 2 - (last.top + (last.height * s) / 2);
    var dx = Math.max(0, (last.width - rect.width / s) / 2);
    var dy = Math.max(0, (last.height - rect.height / s) / 2);
    var thumbRadius = radiusOf(thumbs[index]) / s;
    var finalRadius = radiusOf(img);
    var from = {
      transform: "translate(" + tx + "px," + ty + "px) scale(" + s + ")",
      clipPath: "inset(" + dy + "px " + dx + "px " + dy + "px " + dx + "px round " + thumbRadius + "px)"
    };
    var to = {
      transform: "translate(0px,0px) scale(1)",
      clipPath: "inset(0px 0px 0px 0px round " + finalRadius + "px)"
    };
    var frames = reverse ? [to, from] : [from, to];
    return img.animate(frames, { duration: DURATION, easing: EASE, fill: "both" });
  }

  function lockPage(lock) {
    var html = document.documentElement;
    if (lock) {
      var bar = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      if (bar > 0) html.style.paddingRight = bar + "px";
      outside.forEach(function (el) {
        el.setAttribute("inert", "");
      });
    } else {
      html.style.overflow = "";
      html.style.paddingRight = "";
      outside.forEach(function (el) {
        el.removeAttribute("inert");
      });
    }
  }

  function open(i, source) {
    if (isOpen || busy) return;
    index = i;
    origin = source;
    isOpen = true;
    busy = true;
    box.hidden = false;
    load(i);
    lockPage(true);
    box.classList.remove("is-settled");
    var rect = thumbs[i].getBoundingClientRect();
    window.requestAnimationFrame(function () {
      box.classList.add("is-open");
      var closeBtn = box.querySelector("[data-lightbox-close].btn");
      if (closeBtn) closeBtn.focus({ preventScroll: true });
      if (reduceMotion.matches) {
        box.classList.add("is-settled");
        busy = false;
        return;
      }
      thumbs[i].classList.add("is-source");
      var anim = flipFrom(rect, false);
      if (!anim) {
        thumbs[i].classList.remove("is-source");
        box.classList.add("is-settled");
        busy = false;
        return;
      }
      anim.onfinish = function () {
        anim.cancel();
        thumbs[i].classList.remove("is-source");
        box.classList.add("is-settled");
        busy = false;
      };
    });
  }

  function finishClose() {
    box.hidden = true;
    box.classList.remove("is-open", "is-settled");
    img.removeAttribute("src");
    lockPage(false);
    isOpen = false;
    busy = false;
    thumbs.forEach(function (t) {
      t.classList.remove("is-source");
    });
    if (origin) origin.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen || busy) return;
    busy = true;
    box.classList.remove("is-settled", "is-open");
    var target = thumbs[index];
    var rect = target.getBoundingClientRect();
    var onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
    if (reduceMotion.matches || !onScreen) {
      if (reduceMotion.matches) {
        finishClose();
        return;
      }
      var fade = img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: EASE, fill: "both" });
      fade.onfinish = function () {
        fade.cancel();
        finishClose();
      };
      return;
    }
    target.classList.add("is-source");
    var anim = flipFrom(rect, true);
    if (!anim) {
      finishClose();
      return;
    }
    anim.onfinish = function () {
      anim.cancel();
      finishClose();
    };
  }

  function go(delta) {
    if (!isOpen || busy) return;
    var next = (index + delta + thumbs.length) % thumbs.length;
    if (reduceMotion.matches) {
      index = next;
      load(next);
      return;
    }
    busy = true;
    var out = img.animate(
      [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(" + (-delta * 24) + "px)" }],
      { duration: 160, easing: "ease-in", fill: "both" }
    );
    out.onfinish = function () {
      index = next;
      load(next);
      var inn = img.animate(
        [{ opacity: 0, transform: "translateX(" + (delta * 24) + "px)" }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 260, easing: EASE, fill: "both" }
      );
      out.cancel();
      inn.onfinish = function () {
        inn.cancel();
        busy = false;
      };
    };
  }

  function focusables() {
    return Array.prototype.slice.call(box.querySelectorAll("button:not([disabled])"));
  }

  function onKey(e) {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      var list = focusables();
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !box.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !box.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function initSwipe() {
    stage.addEventListener("pointerdown", function (e) {
      if (!isOpen || busy || e.pointerType === "mouse") return;
      swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    img.addEventListener("pointerdown", function (e) {
      if (!isOpen || busy) return;
      swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
      if (img.setPointerCapture) {
        try {
          img.setPointerCapture(e.pointerId);
        } catch (err) {
          swipe.capture = false;
        }
      }
    });
    img.addEventListener("pointermove", function (e) {
      if (!swipe || swipe.id !== e.pointerId || reduceMotion.matches) return;
      var dx = e.clientX - swipe.x;
      img.style.transform = "translateX(" + dx * 0.4 + "px)";
    });
    function end(e) {
      if (!swipe || swipe.id !== e.pointerId) return;
      var dx = e.clientX - swipe.x;
      var dy = e.clientY - swipe.y;
      swipe = null;
      img.style.transform = "";
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1);
    }
    img.addEventListener("pointerup", end);
    img.addEventListener("pointercancel", function () {
      swipe = null;
      img.style.transform = "";
    });
  }

  function init() {
    box = document.getElementById("lightbox");
    if (!box) return;
    img = box.querySelector(".lightbox__img");
    caption = box.querySelector(".lightbox__caption");
    counter = box.querySelector(".lightbox__counter");
    stage = box.querySelector(".lightbox__stage");
    thumbs = Array.prototype.slice.call(document.querySelectorAll(".thumb"));
    outside = [document.querySelector("main"), document.querySelector(".site-header"), document.querySelector(".site-footer"), document.querySelector(".skip-link"), document.querySelector(".depth-rail"), document.querySelector(".depth-capsule")].filter(Boolean);

    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        open(i, t);
      });
    });
    box.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    box.querySelector("[data-lightbox-prev]").addEventListener("click", function () {
      go(-1);
    });
    box.querySelector("[data-lightbox-next]").addEventListener("click", function () {
      go(1);
    });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", function () {
      if (isOpen) fit(index);
    });
    document.addEventListener("abisal:lang", function () {
      if (isOpen) describe(index);
    });
    img.addEventListener("error", function () {
      var small = thumbImage(index);
      if (small && img.src !== small.src) img.src = small.currentSrc || small.src;
    });
    initSwipe();
  }

  Abisal.gallery = { init: init };
})();
