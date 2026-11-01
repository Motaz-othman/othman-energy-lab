# Cooling Plant Selector

Hourly (8,760 h) screening tool comparing complete cooling plants (pre-cooling, HT/LT chillers, heat rejection, pumps and terminal units) for a data hall with a liquid cooling loop and an air cooling loop:
air-cooled chillers, air-cooled chillers with free-cooling dry coolers, water-cooled chillers with adiabatic coolers, and water-cooled chillers with cooling towers.

Open `index.html` here, or the standalone build `dist/cooling-plant.html`.

## Files
| File | What it holds |
|---|---|
| `index.html` | Page layout, inputs, result tabs (Overview, Systems, Energy & water, Initial cost, Climate, Method) |
| `style.css` | Page-specific styles: summary cards, system view, schematic, operating-mode bars |
| `js/model.js` | Options, cost rates, chiller model, hourly simulation, design-day check, scoring |
| `js/systems.js` | Per-system description, strengths and watch-outs, equipment roles, and the connection schematic |
| `js/app.js` | Inputs, rendering of the results, events |

Part of Othman Energy Lab, Data Centers focus area. Shared modules it uses (in `../../shared/`): `site.js`, `ui.js`, `cities.js`, `psychro.js`, `weather.js`, `base.css`, Chart.js.

## Where to change things
- **Add a city:** append an entry to `CITIES` in `shared/js/cities.js` (`hi`, `lo` in °C, `rh` in %, `elev` in m, `sig` = day-to-day temperature variability in K). Every calculator that uses the city list gets it.
- **Add a cooling option:** add it to `OPTIONS` in `js/model.js`, then add its branch in `hourModel()` (leaving water temperature, condensing temperature, chiller type, fan power), and its description and schematic layout to `SYS` in `js/systems.js`.
- **Chiller performance:** `chillerPower()` and `eirPLR` in `js/model.js`. Rated COP defaults are ASHRAE 90.1-2019 Path A minimums; part-load curves are from the EnergyPlus reference datasets.
- **Cost rates:** `RATES` in `js/model.js` (indicative placeholders; replace with project rates).

## Method summary
- Each hour, each loop: return water is pre-cooled by the outdoor device; free-cooling fraction FF = (T_ret − T_out)/(T_ret − T_sup); the chiller trims the remainder.
- Chillers: P = (Q_cap / COP_rated) × EIRFT × EIRFPLR (DOE-2 / EnergyPlus form). EIRFT is scaled by lift from the AHRI 550/590 rating point, because 20–30 °C chilled water is outside published curve ranges.
- MLC per ASHRAE 90.4 = annual mechanical energy ÷ annual cooling load.
- Design-day check at 100% load at the design dry-bulb and wet-bulb. Options that fail it, or need water when none is available, are excluded from the recommendation.

## Limitations
Screening-level only. Built-in city years are generated from monthly normals and understate extremes; use EPW files for design. Approaches, fan and pump fractions and cost rates are typical assumptions. Confirm with vendor selections and a detailed energy model.
