(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var MIN_PEOPLE = 1;
  var MAX_PEOPLE = 4;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function alertIcon() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "8.5");
    svg.appendChild(circle);
    ["M12 7.5v5.2", "M12 16.3v.2"].forEach(function (d) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    return svg;
  }

  var form, confirmBox, summary, live, fields, people, decBtn, incBtn;
  var errors = {};
  var attempted = false;
  var lastBooking = null;

  function t(key, vars) {
    return Abisal.i18n.t(key, vars);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getMonth() !== Number(m[2]) - 1) return null;
    return d;
  }

  function startOfToday() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function check(name) {
    var data = new FormData(form);
    switch (name) {
      case "course":
        return data.get("course") ? null : "booking.errors.course";
      case "date": {
        var raw = data.get("date");
        if (!raw) return "booking.errors.dateRequired";
        var d = parseDate(raw);
        if (!d) return "booking.errors.dateRequired";
        if (d < startOfToday()) return "booking.errors.datePast";
        if (d.getDay() === 1) return "booking.errors.dateMonday";
        return null;
      }
      case "people": {
        var n = Number(data.get("people"));
        return Number.isInteger(n) && n >= MIN_PEOPLE && n <= MAX_PEOPLE ? null : "booking.errors.people";
      }
      case "experience":
        return data.get("experience") ? null : "booking.errors.experience";
      case "name":
        return String(data.get("name") || "").trim().length >= 2 ? null : "booking.errors.name";
      case "phone": {
        var phone = String(data.get("phone") || "").trim();
        var digits = phone.replace(/\D/g, "");
        return /^[+()\d\s.-]+$/.test(phone) && digits.length >= 9 && digits.length <= 15 ? null : "booking.errors.phone";
      }
      case "privacy":
        return form.querySelector("#f-privacy").checked ? null : "booking.errors.privacy";
      default:
        return null;
    }
  }

  function renderError(name) {
    var f = fields[name];
    if (!f) return;
    var key = errors[name];
    if (f.error) {
      if (key) {
        f.error.textContent = "";
        f.error.appendChild(alertIcon());
        var span = document.createElement("span");
        span.textContent = t(key, { min: Abisal.i18n.fmt.number(MIN_PEOPLE), max: Abisal.i18n.fmt.number(MAX_PEOPLE) });
        f.error.appendChild(span);
        f.error.hidden = false;
      } else {
        f.error.hidden = true;
        f.error.textContent = "";
      }
    }
    f.controls.forEach(function (c) {
      if (key) c.setAttribute("aria-invalid", "true");
      else c.removeAttribute("aria-invalid");
    });
    if (f.group) {
      if (key) f.group.setAttribute("aria-invalid", "true");
      else f.group.removeAttribute("aria-invalid");
    }
  }

  function validate(name) {
    var key = check(name);
    if (key) errors[name] = key;
    else delete errors[name];
    renderError(name);
    return !key;
  }

  function renderSummary(show) {
    if (show && Object.keys(errors).length) {
      summary.textContent = "";
      summary.appendChild(alertIcon());
      var span = document.createElement("span");
      span.textContent = t("booking.errors.summary");
      summary.appendChild(span);
      summary.hidden = false;
    } else {
      summary.hidden = true;
      summary.textContent = "";
    }
  }

  function setPeople(value) {
    var n = Math.round(Number(value));
    if (!Number.isFinite(n)) n = MIN_PEOPLE;
    n = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, n));
    people.value = String(n);
    decBtn.setAttribute("aria-disabled", n <= MIN_PEOPLE ? "true" : "false");
    incBtn.setAttribute("aria-disabled", n >= MAX_PEOPLE ? "true" : "false");
    return n;
  }

  function courseName(value) {
    var map = { try: "courses.try.name", open: "courses.open.name", advanced: "courses.advanced.name", certified: "courses.certified.name" };
    return map[value] ? t(map[value]) : value;
  }

  function experienceName(value) {
    var map = { none: "booking.exp1", try: "booking.exp2", certified: "booking.exp3" };
    return map[value] ? t(map[value]) : value;
  }

  function renderConfirmation() {
    if (!lastBooking) return;
    var list = document.getElementById("confirm-summary");
    list.textContent = "";
    var rows = [
      [t("booking.course"), courseName(lastBooking.course)],
      [t("booking.date"), capitalise(Abisal.i18n.fmt.date(lastBooking.date))],
      [t("booking.people"), Abisal.i18n.fmt.number(lastBooking.people)],
      [t("booking.experience"), experienceName(lastBooking.experience)],
      [t("booking.name"), lastBooking.name]
    ];
    rows.forEach(function (row) {
      var div = document.createElement("div");
      div.className = "facts__row";
      var dt = document.createElement("dt");
      dt.textContent = row[0];
      var dd = document.createElement("dd");
      dd.textContent = row[1];
      div.appendChild(dt);
      div.appendChild(dd);
      list.appendChild(div);
    });
  }

  function capitalise(str) {
    return str ? str.charAt(0).toLocaleUpperCase(Abisal.i18n.locale()) + str.slice(1) : str;
  }

  function onSubmit(e) {
    e.preventDefault();
    attempted = true;
    var order = ["course", "date", "people", "experience", "name", "phone", "privacy"];
    var firstInvalid = null;
    order.forEach(function (name) {
      if (!validate(name) && !firstInvalid) firstInvalid = name;
    });
    renderSummary(Boolean(firstInvalid));
    if (firstInvalid) {
      var target = fields[firstInvalid].controls[0];
      if (target) target.focus();
      return;
    }
    var data = new FormData(form);
    lastBooking = {
      course: data.get("course"),
      date: parseDate(data.get("date")),
      people: Number(data.get("people")),
      experience: data.get("experience"),
      name: String(data.get("name")).trim()
    };
    renderConfirmation();
    form.hidden = true;
    confirmBox.hidden = false;
    confirmBox.classList.remove("is-entering");
    void confirmBox.offsetWidth;
    confirmBox.classList.add("is-entering");
    live.textContent = t("booking.success.live", { hours: Abisal.i18n.fmt.hours(24) });
    var title = document.getElementById("confirm-title");
    title.focus({ preventScroll: true });
    var wrap = confirmBox.closest(".booking__form-wrap");
    var rect = wrap.getBoundingClientRect();
    if (rect.top < 80 || rect.top > window.innerHeight * 0.6) {
      wrap.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }

  function reset() {
    form.reset();
    errors = {};
    attempted = false;
    Object.keys(fields).forEach(renderError);
    renderSummary(false);
    setPeople(1);
    lastBooking = null;
    live.textContent = "";
    confirmBox.hidden = true;
    confirmBox.classList.remove("is-entering");
    form.hidden = false;
    fields.course.controls[0].focus();
  }

  function init() {
    form = document.getElementById("booking-form");
    if (!form) return;
    confirmBox = document.getElementById("booking-confirm");
    summary = document.getElementById("form-summary");
    live = document.getElementById("booking-live");
    people = document.getElementById("f-people");
    decBtn = form.querySelector('[data-step="-1"]');
    incBtn = form.querySelector('[data-step="1"]');

    fields = {
      course: { controls: [form.querySelector("#f-course")], error: form.querySelector("#f-course-error") },
      date: { controls: [form.querySelector("#f-date")], error: form.querySelector("#f-date-error") },
      people: { controls: [people], error: null },
      experience: { controls: Array.prototype.slice.call(form.querySelectorAll('input[name="experience"]')), error: form.querySelector("#f-exp-error"), group: form.querySelector(".field--group") },
      name: { controls: [form.querySelector("#f-name")], error: form.querySelector("#f-name-error") },
      phone: { controls: [form.querySelector("#f-phone")], error: form.querySelector("#f-phone-error") },
      privacy: { controls: [form.querySelector("#f-privacy")], error: form.querySelector("#f-privacy-error") }
    };

    var dateInput = fields.date.controls[0];
    dateInput.min = todayISO();

    setPeople(people.value);
    decBtn.addEventListener("click", function () {
      setPeople(Number(people.value) - 1);
    });
    incBtn.addEventListener("click", function () {
      setPeople(Number(people.value) + 1);
    });
    people.addEventListener("change", function () {
      setPeople(people.value);
    });

    Object.keys(fields).forEach(function (name) {
      fields[name].controls.forEach(function (control) {
        var evt = control.type === "radio" || control.type === "checkbox" || control.tagName === "SELECT" || control.type === "date" ? "change" : "blur";
        control.addEventListener(evt, function () {
          if (attempted || name === "date") {
            validate(name);
            if (attempted) renderSummary(Object.keys(errors).length > 0);
          }
        });
        if (evt === "blur") {
          control.addEventListener("input", function () {
            if (errors[name]) validate(name);
          });
        }
      });
    });

    form.addEventListener("submit", onSubmit);
    document.getElementById("confirm-again").addEventListener("click", reset);

    document.querySelectorAll("[data-book]").forEach(function (link) {
      link.addEventListener("click", function () {
        fields.course.controls[0].value = link.getAttribute("data-book");
        if (errors.course) validate("course");
      });
    });

    document.addEventListener("abisal:lang", function () {
      Object.keys(errors).forEach(renderError);
      renderSummary(!summary.hidden);
      renderConfirmation();
    });
  }

  Abisal.form = { init: init };
})();
