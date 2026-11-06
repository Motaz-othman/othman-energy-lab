# Othman Energy Lab

**Code-based. Beyond the minimum.**

We guide engineers and clients to the right system: less energy, lower cost, a cleaner planet. Our analysis tools are built on recognised standards (ASHRAE, AHRI), start from what the code requires, and show how far a practical design can go beyond the prescriptive path and LEED.

The site is plain HTML, CSS and JavaScript: there's no backend and no build step, and nothing is uploaded. It can be hosted as a static site (e.g. Vercel, with no framework, build command or output directory).

## Run it
Open `index.html` in a browser. For development, run a local server from this folder:
```
npx http-server -p 8000 -c-1      # then open http://localhost:8000
```

## Focus areas and tools
| Focus area | Tool | Folder | What it does |
|---|---|---|---|
| Data Centers | Cooling Plant Selector | `data-centers/cooling-plant/` | Hourly (8,760 h) comparison of air-cooled chillers, free-cooling dry coolers, adiabatic coolers and cooling towers for a data hall with liquid and air cooling loops. See its [README](data-centers/cooling-plant/README.md). |

## Project layout
```
index.html                    home page: hero and schematic, recent tools, our focus
about/index.html              goals, vision and mission, values, approach, standards
404.html                      page-not-found page (served by the host for missing addresses)
contact/index.html            contact form (sender email + message); see SITE.email / SITE.formEndpoint in shared/js/site.js
shared/                       used by every page
  css/base.css                theme tokens (light/dark, brand green), site bar and footer, buttons,
                              section and tool cards, inputs, tables, tabs
  js/site.js                  site name, tagline, top-bar message, contact email, footer links, header and footer
  img/                        icon.svg (browser tab), apple-touch-icon.png (phone home screen), og-image.png (link previews)
  js/ui.js                    $, fmt, esc, table(), kpis(), pct(), Chart.js helpers (baseOpts, mk, hbar)
  js/cities.js                built-in city climate normals (1991–2020 monthly high, low, RH)
  js/psychro.js               ASHRAE psychrometrics: saturation pressure, humidity ratio, wet-bulb
  js/weather.js               station weather loader; EPW and CSV parsers; generated-year fallback; sample CSV generator
  data/weather/<city>.js      measured hourly year (TMYx 2011–2025) + ASHRAE 2025 design conditions per built-in city,
                              from climate.onebuilding.org (loaded only when that city is picked)
  lib/chart.umd.min.js        Chart.js 4.4.1 (MIT licence, see lib/CHARTJS-LICENSE.md)
<focus-area>/                 one folder per focus area, e.g. data-centers/
  index.html                  focus area page: intro and its tools
  <tool>/                     one folder per tool, e.g. data-centers/cooling-plant/
    index.html                page layout and inputs
    style.css                 page-specific styles (loads after shared/css/base.css)
    js/                       the tool's model and page logic
    README.md                 method, assumptions, where to change things
tools/build.js                builds standalone single-file pages into dist/
tools/weather-convert.js      turns downloaded TMYx EPW + STAT files into shared/data/weather/; station list in tools/weather-sources.txt
dist/<tool>.html              generated: one self-contained file per tool, for sharing
```
Scripts share global scope. Each tool loads, in order: Chart.js, `shared/js/site.js`, `shared/js/ui.js`, any shared data and engineering modules it needs, then its own scripts.

## Brand
- Name, tagline, top-bar message (`slogan`), contact email and footer links are set once in `shared/js/site.js` (`SITE`, `NAV`). The top bar shows the logo and message; page links are in the footer. The logo mark (three bars stepping down, the last in green) is `MARK` in the same file.
- Brand colours are `--brand` (fills: buttons, active tabs) and `--brand-ink` (text and links) in `shared/css/base.css`, with light and dark values. Both meet 4.5:1 contrast. Chart colours (`--s1`…`--s4`) are separate and are for data only.

## Contact form
The form asks only for the sender's email and a message. With `SITE.formEndpoint` empty, Send opens the visitor's email app addressed to `SITE.email`. To receive messages directly instead, create a form at a form service (e.g. Formspree), paste its URL into `SITE.formEndpoint`, and messages arrive in your inbox with the sender's email as the reply-to.

## Add a tool
1. Copy `data-centers/cooling-plant/` into the focus area folder (e.g. `data-centers/<new-tool>/`) and remove what you don't need. Tool folder names must be unique across focus areas.
2. Keep the shared parts in its `index.html`: the `sitebar` header and `sitefoot` footer (with `data-root="../../"`), the breadcrumb (Home / area / tool), and the links to `../../shared/css/base.css`, `../../shared/lib/chart.umd.min.js`, `../../shared/js/site.js` and `../../shared/js/ui.js`, plus any shared modules it uses (`psychro.js`, `cities.js`, `weather.js`).
3. Add a card for it on its focus area page and in the Recent tools section of the home page (move the "New" tag to it), and update the Standards section on the About page if it uses new standards.
   Give its page a `<meta name="description">` and the icon and sharing tags, copied from an existing page.
4. Build its standalone file: `node tools/build.js <new-tool>`.

Code that a second tool also needs belongs in `shared/`, not copied between tools.

## Add a focus area
1. Copy `data-centers/index.html` to `<new-area>/index.html` and change the intro, the facts panel and the tool cards.
2. Add it to `NAV` in `shared/js/site.js` (footer links), and link it from the matching card in the Our focus section of the home page.

## Weather data
Each built-in city uses its main airport station: a measured typical year (TMYx 2011–2025) and the ASHRAE 2025 Handbook of Fundamentals design conditions, both from climate.onebuilding.org (stations listed in `tools/weather-sources.txt`). The automatic design condition is the ASHRAE extreme annual dry-bulb and wet-bulb. Hourly wet-bulb is limited to that extreme + 1 K to remove faulty humidity readings (the count per city is stored as `wbCapped`). To add a city: add it to `CITIES` in `shared/js/cities.js` (monthly normals are the fallback), download its TMYx zip, and run `node tools/weather-convert.js`. The standalone file in `dist/` cannot load these data files and uses the generated year.

## Publishing
- Static hosting, e.g. Vercel: framework preset "Other", no build command, output directory = this folder. `.vercelignore` keeps `tools/`, `dist/` and the READMEs off the public site.
- Live at https://www.oenergylab.com (Vercel; `oenergylab.com` redirects to www; also https://othman-energy-lab1.vercel.app). Deploys automatically on every push to `main`. Domain registered at Namecheap, renews Nov 2027; DNS: A `@` → 216.198.79.1, CNAME `www` → Vercel.
- Link previews (LinkedIn, WhatsApp, X) use full addresses in `og:image`, `og:url` and `canonical` on every page. They point to https://www.oenergylab.com; if the domain changes, replace it in those tags on every page.
- The contact form needs `SITE.formEndpoint` set (see above) so visitors without an email app can still send messages.

## Standalone files
`node tools/build.js` rebuilds `dist/<tool>.html` for every tool (or pass one name). It drops the site bar, breadcrumb and footer, inlines the CSS and JS into one page and loads Chart.js from the CDN, so that file needs internet for its charts; tables and results work offline. Rebuild after editing any tool or shared file.
