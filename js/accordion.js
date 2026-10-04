(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});

  function init() {
    document.querySelectorAll(".accordion__trigger").forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!panel) return;
      trigger.addEventListener("click", function () {
        var open = trigger.getAttribute("aria-expanded") !== "true";
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        panel.classList.toggle("is-open", open);
      });
    });
  }

  Abisal.accordion = { init: init };
})();
