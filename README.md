# Abisal — diving school landing page

A single-page, bilingual (Spanish / English) landing page for **Abisal**, a small diving school in Alicante. The page is built as one continuous descent: the background moves from the bright surface to deep water as you scroll, and a depth indicator shows the current depth in metres.

> **All business information on this site is fictional demonstration data.** The school, the instructors, prices, courses, opening hours, address (Muelle de Levante 12, 03001 Alicante), phone (+34 600 000 000), email (hola@abisal.example) and Instagram handle (@abisal.dive) are placeholders. The booking form is a demo: it validates and shows a confirmation, but sends nothing anywhere. The instructor names are attached to stock portraits of unrelated people.

## Running it

Open `index.html` directly in a browser (`file://` works), or serve the folder:

```bash
python -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`. Add `?lang=en` or `?lang=es` to force a language.

There is no build step, no package manager, and no external request at runtime: no CDN, no Google Fonts, no analytics, no cookies, no embedded map.

## Structure

```text
index.html
css/
  tokens.css       design tokens: colours, depth-zone stops, type scale, spacing, radii, easing, durations, glass parameters
  base.css         @font-face, reset, typography, layout primitives, focus styles, reveal and language crossfade
  components.css   shared button component (all variants), header capsule, nav and language "drops", depth rail and capsule, cards, form controls, accordion, lightbox, accessibility-mode overrides
  sections.css     the depth gradient system and every section layout
js/
  i18n/es.js       Spanish dictionary (registers on window.ABISAL_I18N)
  i18n/en.js       English dictionary (identical key structure)
  i18n.js          language detection, text and attribute application, Intl formatting, crossfade and scroll anchoring
  depth.js         the single passive scroll handler + requestAnimationFrame loop, depth interpolation, header hide/show, IntersectionObserver ink switching
  glass.js         cursor-following highlight, ripple, nav and language drops, mobile menu, Chromium refraction
  motion.js        hero word reveal, section reveals, instructor clip reveal, location counters, dive rope, hero parallax and rays, bubbles / marine snow canvas
  gallery.js       FLIP lightbox with keyboard, swipe and focus trap
  accordion.js     FAQ accordion
  form.js          booking form validation, stepper and confirmation state
  main.js          start-up order and failure handling
assets/
  images/          optimised WebP photos, og-image.jpg (1200×630), favicon.svg
  fonts/           Sora and Manrope, Latin subset, static .woff2 instances
README.md
```

## How the depth system works

* Every section has its own `linear-gradient` from `--from` to `--to`. The `--to` of each section is the same token as the `--from` of the next, so there are no seams. The gradients are pure CSS and do not depend on document height.
* The five brief colours (`#EAF6F6`, `#9FD3D6`, `#1F6F8B`, `#0B2A3C`, `#07202E`) are the anchors. The in-between stops were interpolated in OKLab and fixed as hex tokens in `tokens.css`.
* A text-free **thermocline** band (minimum 208px) between Courses and First Dive carries the gradient from `#9FD3D6` to `#1F6F8B`. Dark text is used above it and light text below it. The mid tones in between give enough contrast to neither, which is why no text sits there.
* The current depth is a linear interpolation between section anchors (0, 2, 5, 8, 11, 14, 16, 17 m, and 18 m at the end of the page). It is formatted with `Intl.NumberFormat(..., { style: "unit", unit: "meter" })` in the active locale.

## Contrast verification

Contrast was calculated numerically, not judged by eye, using two scripts (kept outside this project):

1. **Rendered-pixel check.** It loads the page in Chromium with all text made transparent and takes a full-page screenshot. It then measures the WCAG ratio of every text run against every background pixel underneath it, including photos, gradients and card overlays. It was run at 360, 768, 1024 and 1440 px in both languages: 0 failures. The lowest ratio is 4.9:1, on the coral "Send request" button over the deepest zone.
2. **Token check.** It samples every section gradient at 64 points and composites each semi-transparent surface over it. The glass header, depth rail, capsule and buttons are tested against their worst possible background, from white to black. All pass at 4.5:1 for normal text and 3:1 for large text.

Coral `#FF7A59` reaches only about 2.3:1 as text on the light zones. So in the light and mid zones, prices and depth values sit on small coral chips with `#0B2A3C` text (5.8:1). Coral is used directly as text only for the large location depth numbers in the deep zone, where it passes 3:1.

## Liquid glass and fallbacks

* All buttons share one `.btn` component with `--primary` (coral glass), `--glass` (neutral) and `--on-dark` modifiers. Each glass surface is built from several layers:
  * a semi-transparent fill
  * `backdrop-filter: blur() saturate()`
  * a top-bright gradient border
  * an inner highlight and an inner shadow
  * a convex lens highlight
  * a cursor-following specular highlight (`--mx` / `--my`)
  * a single sheen on hover
  * a thin ripple on press
* **Refraction** (`feDisplacementMap` with a gradient displacement map in a data URI) is applied only to the hero's primary button and the header button.
  * Detection uses features only, never the user agent: `CSS.supports("backdrop-filter", "url(#…)")` plus `SVGFEDisplacementMapElement`.
  * The distortion lives on a separate feathered rim layer above the button. If an engine parses `backdrop-filter: url()` but cannot render it, that layer stays transparent, and the normal blur and saturate glass shows through unchanged.
* `prefers-reduced-transparency`, `prefers-contrast: more`, `prefers-reduced-motion` and missing `backdrop-filter` support each have dedicated overrides.

## Libraries

None. Everything is vanilla HTML, CSS and JavaScript. No i18n, animation or smooth-scroll library is used.

## Fonts

| Family | Use | Weights shipped | Source | Licence |
| --- | --- | --- | --- | --- |
| Sora | headings | 300, 400, 500, 600 | Google Fonts (variable font, Latin subset) — https://fonts.google.com/specimen/Sora | SIL Open Font License 1.1 |
| Manrope | body and interface | 400, 500, 600, 700 | Google Fonts (variable font, Latin subset) — https://fonts.google.com/specimen/Manrope | SIL Open Font License 1.1 |

The Latin-subset variable `.woff2` files were downloaded once at build time. Static instances of only the weights used were then generated with fontTools and saved as `.woff2`. Each file was checked to contain `ñ á é í ó ú ü Ñ Á É Í Ó Ú Ü ¿ ¡ € « »` and typographic punctuation. Fonts are loaded locally with `@font-face` and `font-display: swap`.

## Photography

All photos come from [Unsplash](https://unsplash.com) and are used under the [Unsplash License](https://unsplash.com/license) (free to use; attribution given here as a courtesy). They were resized to at most 2000 px wide, lightly colour-matched to the palette, and converted to WebP at quality 80, with smaller versions for the gallery. They illustrate the kind of Mediterranean diving described. Several were taken elsewhere (Greece, Türkiye, Tenerife, Marseille), and none show the fictional school.

| File(s) | Subject | Photographer | Source |
| --- | --- | --- | --- |
| hero-2000.webp, hero-1200.webp, og-image.jpg | Light rays over a Posidonia meadow | Benjamin L. Jones | https://unsplash.com/photos/8mPugU7M4F8 |
| hero-m-1000.webp | Sun rays in clear water, Parga (mobile hero) | Christina Spiliotopoulou | https://unsplash.com/photos/fkPDVWHikIs |
| split-1600.webp, split-800.webp | Split-level view of a rocky cove | Scorn Pion | https://unsplash.com/photos/5B2PeCYnwQI |
| tabarca-1000.webp, tabarca-600.webp | Aerial view of Tabarca Island | Emil Gabrovski | https://unsplash.com/photos/5tVZT1hiroU |
| instructor-lucia.webp | Portrait with mask and snorkel | JC Falcon | https://unsplash.com/photos/GRQLq31v6Oo |
| instructor-pablo.webp | Diver surfacing by a boat ladder, Marseille | Maël Balland | https://unsplash.com/photos/IsCWgZ604Yk |
| instructor-marta.webp | Swimmer climbing a boat ladder, Corfu | Andrea Giardini | https://unsplash.com/photos/Yr9DN6sLAEE |
| g-diver-rocks-*.webp | Diver over algae-covered rocks | Artists Eyes | https://unsplash.com/photos/nB-m_DxvCwE |
| g-posidonia-*.webp | Posidonia meadow with fish, Chalkidiki | Benjamin L. Jones | https://unsplash.com/photos/39SlEAlZEq8 |
| g-grouper-*.webp | Dusky grouper | Pascal van de Vendel | https://unsplash.com/photos/yXY16jjngpY |
| g-octopus-*.webp | Octopus on the seabed, La Herradura | dani grau | https://unsplash.com/photos/mzZHXETzU1A |
| g-wall-*.webp | Divers by a rock wall, Tenerife | Janesca | https://unsplash.com/photos/H_bgHzBaFfk |
| g-bream-*.webp | Sea bream over rocks, Calafat | Clovis Wood | https://unsplash.com/photos/Uxd46TfqGUc |
| g-diver-teal-*.webp | Diver in blue-green water, Heraklion | Adrien Delforge | https://unsplash.com/photos/yZrhORWUATg |
| g-diver-sand-*.webp | Diver over sand and rock, Tenerife | Janesca | https://unsplash.com/photos/yrJ1PLuUzDU |

The favicon and the map placeholder are original inline SVG.

## Notes

* `og:image` uses a relative path. Replace it with an absolute URL once the site has a domain.
* The privacy policy link is a placeholder (`#privacy`).
