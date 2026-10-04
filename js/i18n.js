(function () {
  "use strict";

  var Abisal = (window.Abisal = window.Abisal || {});
  var DICTS = window.ABISAL_I18N || {};
  var LOCALES = { es: "es-ES", en: "en-GB" };
  var SUPPORTED = ["es", "en"];
  var STORAGE_KEY = "abisal-lang";
  var FADE_MS = 90;
  var root = document.documentElement;
  var current = null;
  var cache = {};

  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function writeStorage(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      return false;
    }
    return true;
  }

  function detect() {
    var param = null;
    try {
      param = new URLSearchParams(window.location.search).get("lang");
    } catch (e) {
      param = null;
    }
    if (param && SUPPORTED.indexOf(param) !== -1) return param;
    var stored = readStorage();
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || "").toLowerCase().split("-")[0];
      if (SUPPORTED.indexOf(code) !== -1) return code;
    }
    return "es";
  }

  function lookup(lang, key) {
    var node = DICTS[lang];
    var parts = key.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return null;
      node = node[parts[i]];
    }
    return typeof node === "string" ? node : null;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : m;
    });
  }

  function t(key, vars, lang) {
    var value = lookup(lang || current, key);
    if (value == null) value = lookup("es", key);
    if (value == null) return key;
    return interpolate(value, vars);
  }

  function locale(lang) {
    return LOCALES[lang || current] || LOCALES.es;
  }

  function intl(kind, options, lang) {
    var loc = locale(lang);
    var id = kind + "|" + loc + "|" + JSON.stringify(options || {});
    if (!cache[id]) {
      if (kind === "number") cache[id] = new Intl.NumberFormat(loc, options);
      else if (kind === "date") cache[id] = new Intl.DateTimeFormat(loc, options);
      else if (kind === "list") cache[id] = Intl.ListFormat ? new Intl.ListFormat(loc, options) : null;
      else if (kind === "names") cache[id] = Intl.DisplayNames ? new Intl.DisplayNames([loc], options) : null;
    }
    return cache[id];
  }

  function capitalise(str) {
    if (!str) return str;
    return str.charAt(0).toLocaleUpperCase(locale()) + str.slice(1);
  }

  function unitFormat(unit, value, display, digits, lang) {
    try {
      return intl("number", {
        style: "unit",
        unit: unit,
        unitDisplay: display || "short",
        maximumFractionDigits: digits || 0,
        minimumFractionDigits: digits || 0
      }, lang).format(value);
    } catch (e) {
      return value + " " + unit;
    }
  }

  var fmt = {
    number: function (value) {
      return intl("number", { maximumFractionDigits: 0 }).format(value);
    },
    meter: function (value, digits) {
      return unitFormat("meter", value, "short", digits);
    },
    meterParts: function (value) {
      try {
        var parts = intl("number", { style: "unit", unit: "meter", unitDisplay: "short", maximumFractionDigits: 0 }).formatToParts(value);
        var num = "";
        var unit = "";
        var unitFirst = false;
        parts.forEach(function (p) {
          if (p.type === "unit") {
            unit += p.value;
            if (!num) unitFirst = true;
          } else if (p.type !== "literal") {
            num += p.value;
          }
        });
        return { num: num, unit: unit, unitFirst: unitFirst };
      } catch (e) {
        return { num: String(value), unit: "m", unitFirst: false };
      }
    },
    meterRange: function (from, to) {
      var nf = intl("number", { style: "unit", unit: "meter", unitDisplay: "short", maximumFractionDigits: 0 });
      if (nf && typeof nf.formatRange === "function") {
        try {
          return nf.formatRange(from, to);
        } catch (e) {
          return fmt.number(from) + "–" + fmt.meter(to);
        }
      }
      return fmt.number(from) + "–" + fmt.meter(to);
    },
    currency: function (value, signed) {
      var opts = { style: "currency", currency: "EUR", maximumFractionDigits: 0, minimumFractionDigits: 0 };
      if (signed) opts.signDisplay = "always";
      return intl("number", opts).format(value);
    },
    duration: function (value, unit) {
      return unitFormat(unit, value, "long");
    },
    hours: function (value) {
      return unitFormat("hour", value, "long");
    },
    years: function (value) {
      return unitFormat("year", value, "long");
    },
    weekday: function (index) {
      var date = new Date(2024, 0, 7 + Number(index));
      return intl("date", { weekday: "long" }).format(date);
    },
    weekdayRange: function (from, to) {
      return capitalise(t("info.weekRange", { from: fmt.weekday(from), to: fmt.weekday(to) }));
    },
    monthRange: function (from, to) {
      var df = intl("date", { month: "long" });
      var a = new Date(2024, Number(from) - 1, 15);
      var b = new Date(2024, Number(to) - 1, 15);
      if (typeof df.formatRange === "function") {
        try {
          return capitalise(df.formatRange(a, b));
        } catch (e) {
          return capitalise(df.format(a) + "–" + df.format(b));
        }
      }
      return capitalise(df.format(a) + "–" + df.format(b));
    },
    time: function (hhmm) {
      var p = String(hhmm).split(":");
      var d = new Date(2024, 0, 9, Number(p[0]), Number(p[1] || 0));
      return intl("date", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
    },
    timeRange: function (from, to) {
      return fmt.time(from) + "–" + fmt.time(to);
    },
    list: function (items) {
      var lf = intl("list", { style: "long", type: "conjunction" });
      return lf ? lf.format(items) : items.join(", ");
    },
    timeList: function (values) {
      return fmt.list(values.map(fmt.time));
    },
    languages: function (codes) {
      var names = intl("names", { type: "language" });
      var list = codes.map(function (c) {
        return names ? names.of(c) : c.toUpperCase();
      });
      return capitalise(fmt.list(list));
    },
    date: function (date, options) {
      return intl("date", options || { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
    },
    counter: function (currentIndex, total) {
      return t("lightbox.counter", { current: fmt.number(currentIndex), total: fmt.number(total) });
    }
  };

  function parseVars(spec) {
    if (!spec) return null;
    var vars = {};
    spec.split(";").forEach(function (pair) {
      var eq = pair.indexOf("=");
      if (eq === -1) return;
      var name = pair.slice(0, eq).trim();
      var rest = pair.slice(eq + 1).trim();
      var colon = rest.indexOf(":");
      var type = rest.slice(0, colon);
      var raw = rest.slice(colon + 1);
      var num = Number(raw);
      var out = raw;
      if (type === "m") out = fmt.meter(num);
      else if (type === "n") out = fmt.number(num);
      else if (type === "eur") out = fmt.currency(num);
      else if (type === "eur+") out = fmt.currency(num, true);
      else if (type === "h") out = fmt.hours(num);
      else if (type === "wd") out = fmt.weekday(num);
      else if (type === "year") out = String(new Date().getFullYear());
      vars[name] = out;
    });
    return vars;
  }

  function renderFormatted(el) {
    var kind = el.getAttribute("data-fmt");
    var d = el.dataset;
    var text = null;
    switch (kind) {
      case "m":
        text = fmt.meter(Number(d.value));
        break;
      case "m-range":
        text = fmt.meterRange(Number(d.from), Number(d.to));
        break;
      case "eur":
        text = fmt.currency(Number(d.value));
        break;
      case "duration":
        text = fmt.duration(Number(d.value), d.unit);
        break;
      case "years":
        text = fmt.years(Number(d.value));
        break;
      case "langs":
        text = fmt.languages(d.value.split(","));
        break;
      case "months":
        text = fmt.monthRange(d.from, d.to);
        break;
      case "weekday":
        text = capitalise(fmt.weekday(d.value));
        break;
      case "weekday-range":
        text = fmt.weekdayRange(d.from, d.to);
        break;
      case "time-range":
        text = fmt.timeRange(d.from, d.to);
        break;
      case "time-list":
        text = fmt.timeList(d.value.split(","));
        break;
      default:
        text = null;
    }
    if (text != null) el.textContent = text;
  }

  function setStable(el, key, vars) {
    var visible = t(key, vars);
    el.classList.add("stable");
    el.textContent = "";
    var main = document.createElement("span");
    main.textContent = visible;
    el.appendChild(main);
    SUPPORTED.forEach(function (lang) {
      if (lang === current) return;
      var ghost = document.createElement("span");
      ghost.setAttribute("aria-hidden", "true");
      ghost.textContent = t(key, vars, lang);
      el.appendChild(ghost);
    });
  }

  function applyTexts() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var vars = parseVars(el.getAttribute("data-vars"));
      if (el.hasAttribute("data-stable")) {
        setStable(el, key, vars);
      } else {
        el.textContent = t(key, vars);
      }
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var idx = pair.indexOf(":");
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var key = pair.slice(idx + 1).trim();
        el.setAttribute(attr, t(key));
      });
    });
    document.querySelectorAll("[data-fmt]").forEach(renderFormatted);
    document.title = t("meta.title");
    root.setAttribute("lang", current);
  }

  function updateUrl() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("lang", current);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch (e) {
      return false;
    }
    return true;
  }

  function updateSwitcher() {
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === current ? "true" : "false");
    });
  }

  function findAnchor() {
    var headerH = 80;
    var candidates = document.querySelectorAll("main h1, main h2, main h3, main p, main li, main figure");
    for (var i = 0; i < candidates.length; i++) {
      var r = candidates[i].getBoundingClientRect();
      if (r.bottom > headerH && r.height > 0) return { el: candidates[i], top: r.top };
    }
    return null;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function commit(lang, persist) {
    var anchor = window.scrollY > 0 ? findAnchor() : null;
    current = lang;
    applyTexts();
    updateSwitcher();
    if (anchor) {
      var delta = anchor.el.getBoundingClientRect().top - anchor.top;
      if (Math.abs(delta) > 0.5) {
        try {
          window.scrollTo({ top: window.scrollY + delta, left: 0, behavior: "instant" });
        } catch (e) {
          window.scrollTo(0, window.scrollY + delta);
        }
      }
    }
    if (persist) {
      writeStorage(lang);
      updateUrl();
    }
    document.dispatchEvent(new CustomEvent("abisal:lang", { detail: { lang: lang } }));
  }

  function setLanguage(lang, options) {
    options = options || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = "es";
    if (lang === current && !options.force) return;
    if (!options.animate || reducedMotion()) {
      commit(lang, options.persist !== false);
      return;
    }
    root.classList.add("is-switching");
    window.setTimeout(function () {
      commit(lang, options.persist !== false);
      window.requestAnimationFrame(function () {
        root.classList.remove("is-switching");
      });
    }, FADE_MS);
  }

  function init() {
    var lang = detect();
    current = null;
    setLanguage(lang, { animate: false, persist: false, force: true });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = btn.getAttribute("data-lang");
        if (next === current) return;
        setLanguage(next, { animate: true, persist: true });
      });
    });
  }

  Abisal.i18n = {
    init: init,
    t: t,
    fmt: fmt,
    setLanguage: setLanguage,
    locale: function () {
      return locale();
    },
    get lang() {
      return current;
    },
    supported: SUPPORTED.slice()
  };
})();
