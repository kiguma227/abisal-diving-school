(function () {
  "use strict";

  var Abisal = window.Abisal || {};

  function run(name, fn) {
    try {
      fn();
    } catch (e) {
      if (window.console && console.warn) console.warn("Abisal: " + name + " could not start", e);
    }
  }

  function markBroken(img) {
    var host = img.closest(".media-frame, .thumb, .hero__media");
    if (host) host.classList.add("is-broken");
  }

  function watchImages() {
    document.querySelectorAll("main img").forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
        markBroken(img);
        return;
      }
      img.addEventListener("error", function () {
        markBroken(img);
      });
    });
  }

  function start() {
    run("i18n", function () {
      Abisal.i18n.init();
    });
    run("depth", function () {
      Abisal.depth.init();
    });
    run("glass", function () {
      Abisal.glass.init();
    });
    run("motion", function () {
      Abisal.motion.init();
    });
    run("gallery", function () {
      Abisal.gallery.init();
    });
    run("accordion", function () {
      Abisal.accordion.init();
    });
    run("form", function () {
      Abisal.form.init();
    });
    run("images", watchImages);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
