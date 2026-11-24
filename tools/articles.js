// Articles: writes articles/index.html and articles/<slug>/index.html from the content below (one template).
// Usage: node tools/articles.js   (then node tools/build.js to refresh the sitemap)
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..'), B='https://www.oenergylab.com/';
const PERSON={'@id':B+'about/#mutaz-othman'}, ORG={'@id':B+'#org'};
const GA=`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GTM-WMV8R23W"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-FSNWF5QMP9');
</script>`;
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const table=(head,rows)=>`<div class="tw"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const ARTICLES=[
{slug:'how-to-use-cooling-plant-selector', date:'2026-11-22', tool:['Cooling Plant Selector','data-centers/cooling-plant/'],
 title:'How to use the Cooling Plant Selector',
 desc:'Step-by-step guide to the free Cooling Plant Selector: choose the city, enter the IT load and loop temperatures, read the ranked cooling plants, the design cases, energy, water, carbon and cost, and export a PDF or Excel report.',
 body:`<p>The <a href="../../data-centers/cooling-plant/index.html">Cooling Plant Selector</a> compares five cooling plants for a data hall with a liquid cooling loop and an air cooling loop, hour by hour over a full weather year (8,760 hours): air-cooled chillers, air-cooled chillers with free-cooling dry coolers, and water-cooled chillers with cooling towers, adiabatic coolers or hybrid dry coolers and towers, each with plate heat exchanger free cooling. It reports cooling electricity, annual PUE and ASHRAE 90.4 MLC, the electrical peak, water use, carbon emissions, and running and initial cost, and recommends one system for each water case: TSE available, water limited and no water. This guide walks through the inputs and how to read the results.</p>
<h2>1. Choose the weather</h2>
<p>Pick one of the 33 built-in data center cities in the <b>City</b> tab: Gulf cities (Dubai, Abu Dhabi, Riyadh, Jeddah, Dammam, Manama), major US markets (Northern Virginia, Dallas, Phoenix, Atlanta, Columbus, Silicon Valley, Hillsboro, Reno and others), Europe and Asia-Pacific. Each city loads its airport station's measured typical year (TMYx 2011–2025, 8,760 hours) and its ASHRAE 2025 design conditions. For another site, use the <b>Weather file</b> tab to upload an EPW file or a CSV with hourly dry-bulb and humidity; a sample CSV shows the format.</p>
<h2>2. Enter the data hall load</h2>
<ul><li><b>Cooling load (MW)</b>: the IT load at full output.</li>
<li><b>Frequent load (%)</b>: the load the hall runs at most of the time; annual energy, water and cost use it. Peaks always use 100%.</li>
<li><b>Liquid cooling loop</b>: its share of the load and its supply / return temperatures (default 30 / 40 °C for direct-to-chip cooling).</li>
<li><b>Air cooling loop</b>: supply / return for the fan wall units (default 20 / 30 °C).</li></ul>
<h2>3. Set the design condition (optional)</h2>
<p>The <b>design dry-bulb and wet-bulb</b> are blank by default: the tool then checks two coincident design cases from the ASHRAE extremes, Case A with the extreme dry-bulb and Case B with the extreme wet-bulb. Enter a stricter value, such as an ASHRAE 20-year return period, to replace the extreme.</p>
<h2>4. Adjust the engineering inputs (optional)</h2>
<p>The collapsed sections hold the full basis, all with standard defaults you can override: utility tariffs; chillers (ASHRAE 90.1-2025 Path B COP, unit sizes, the condenser-water warning limit); heat rejection (ASHRAE approaches, fan power); pump heads and fan wall units; environmental impact (grid emission factor, refrigerant); electrical losses; and initial cost rates.</p>
<h2>5. Read the results</h2>
<p>One card per system shows annual electricity, peak power, water and CO₂, with the best value in each row marked. Three cards carry a recommendation, one for each water case: <b>If TSE is available</b> (energy, water, peak power, initial cost and carbon weighed together), <b>If water is limited</b> (water counts double) and <b>If there is no water</b> (only dry systems). The tabs below the cards:</p>
<ul><li><b>Systems</b>: the schematic of each plant and its operation by month (free cooling, partial, chiller only) on each loop.</li>
<li><b>Energy &amp; carbon</b>: annual PUE, the ASHRAE 90.4 MLC check and the facility peak, with electricity by component and CO₂ by source.</li>
<li><b>Cost</b>: running cost, initial cost range and payback against air-cooled chillers.</li>
<li><b>Climate</b>: free-cooling potential of the site by month, for dry coolers and for cooling towers.</li></ul>
<h2>6. Export the report</h2>
<p><b>PDF report</b> opens a print-ready A4 report (save it with the browser's Save as PDF). <b>Excel tables</b> downloads the results, the recommendations, your inputs and the monthly operating hours as a workbook.</p>
<h2>Example: a 100 MW data center in Dubai</h2>
<p>At 100% load all year, with 80 MW on the liquid loop and 20 MW on the air loop:</p>
<div class="tw"><table><thead><tr><th>System</th><th>Design peak (MW)</th><th>Electricity (GWh/yr)</th><th>Water (m³/yr)</th><th>Carbon (t CO₂e/yr)</th></tr></thead><tbody><tr><td>Water-cooled chillers + cooling towers + free cooling</td><td>14.2</td><td>72.7</td><td>1,629,980</td><td>37,142</td></tr><tr><td>Hybrid dry coolers and towers + free cooling</td><td>14.2</td><td>77.9</td><td>1,138,317</td><td>38,784</td></tr><tr><td>Adiabatic coolers + free cooling</td><td>20.3</td><td>113.4</td><td>747,562</td><td>54,724</td></tr><tr><td>Air-cooled chillers + dry coolers</td><td>29.8</td><td>127.9</td><td>0</td><td>60,492</td></tr><tr><td>Air-cooled chillers</td><td>29.8</td><td>150.2</td><td>0</td><td>70,920</td></tr></tbody></table></div>
<p>Cooling towers rank first: half the electrical peak of air-cooled chillers and about half the carbon, at the cost of the most water. Where water is limited, the hybrid plant saves about 30% of the water for 7% more electricity.</p>`,
 faq:[[`Which cooling system is best for a data center in a hot climate such as Dubai or Riyadh?`,`For a liquid-cooled hall at 30/40 °C, water-cooled chillers with cooling towers and plate heat exchanger free cooling usually rank first: the lowest electricity, MLC and peak power. They use the most water, so where water is limited a hybrid dry cooler and tower plant or adiabatic coolers trade some energy for much less water. Air-cooled chillers have the highest electrical peak.`],
  [`How is the ASHRAE 90.4 MLC checked?`,`The annual mechanical load component (cooling energy ÷ IT energy) is compared with the maximum annualized MLC in ASHRAE 90.4-2025 Table 6.5 for the site climate zone and IT size.`],
  [`Why does a humid city use more cooling energy than a hotter dry one?`,`Cooling towers and their free cooling depend on the wet-bulb temperature, not the dry-bulb. A humid city such as Mumbai keeps a high wet-bulb all year, so it gets fewer free-cooling hours than Dubai with its dry winters.`],
  [`How are the carbon emissions calculated?`,`Annual cooling electricity × the local grid emission factor, plus water × the energy to supply it (3.5 kWh/m³ for Gulf desalination) × the grid factor, plus refrigerant leakage × its GWP.`]]},

{slug:'how-to-use-low-carbon-cooling-selector', date:'2026-11-24', tool:['Low-Carbon Cooling Selector','data-centers/low-carbon-cooling/'],
 title:'How to use the Low-Carbon Cooling Selector',
 desc:'Step-by-step guide to the free Low-Carbon Cooling Selector: pick the city, compare five data center cooling plants or enter your own numbers, and read the yearly CO2 from electricity, water supply and refrigerant leakage.',
 body:`<p>The <a href="../../data-centers/low-carbon-cooling/index.html">Low-Carbon Cooling Selector</a> finds the data center cooling system with the lowest carbon and gives its yearly emissions in tonnes of CO₂ equivalent. It adds three sources: the electricity the cooling plant uses, the energy needed to supply its water, and the refrigerant that leaks from the chillers.</p>
<h2>1. Choose the location</h2>
<p>Pick the city. Its grid emission factor and water supply energy fill in automatically: US cities use the EPA eGRID subregion rates, Sydney the Australian National Greenhouse Accounts factors, other countries Our World in Data / Ember. Type your own values to replace them, for example a green-power contract.</p>
<h2>2. Compare systems or enter your own numbers</h2>
<ul><li><b>Compare systems</b>: enter the cooling load, average load and liquid-cooled share. The tool runs five cooling plants over the city's measured weather year, the same model as the <a href="../../data-centers/cooling-plant/index.html">Cooling Plant Selector</a>.</li>
<li><b>My own numbers</b>: enter the yearly cooling electricity, water use and refrigerant charge of your system, from the design, a utility bill or the BMS.</li></ul>
<h2>3. Set the refrigerant</h2>
<p>Choose the refrigerant and its yearly leak rate, and the charge per kW for water-cooled and air-cooled chillers. Low-GWP refrigerants such as R-1234ze(E) remove almost all of the leakage share.</p>
<h2>4. Read the results</h2>
<p>One card per system shows its yearly CO₂, lowest first, with a bar split by source. The chart compares the sources side by side, and the table at the bottom lists electricity, water, charge and CO₂ for every system, with the total over the chosen period.</p>`,
 faq:[[`Which part of a cooling system's CO₂ is largest?`,`Electricity, in almost every case: usually 85–99% of the total. Refrigerant leakage can matter with high-GWP refrigerants such as R-134a, and water matters in the Gulf, where desalinated water takes about 3.5 kWh per m³.`],
  [`Where do the grid factors come from?`,`US cities use the EPA eGRID2023 subregion rates; Sydney uses the Australian National Greenhouse Accounts factors (NSW 2025–26); other countries use Our World in Data / Ember, latest year. You can type your own factor, for example a green-power contract.`],
  [`Does it include the IT equipment?`,`No. Only the cooling system: chillers, heat-rejection fans, pumps, CRAH, fan walls and CDUs. IT electricity and UPS losses are not included.`]]},

{slug:'how-to-use-peak-shaving-tank', date:'2026-11-24', tool:['Peak Shaving Tank','data-centers/peak-shaving-tank/'],
 title:'How to use the Peak Shaving Tank',
 desc:'Step-by-step guide to the free Peak Shaving Tank: size a chilled-water tank that covers the rare hottest hours, so the cooling plant and its electrical supply can be rated for a lower design temperature.',
 body:`<p>A cooling plant is rated for the extreme hottest hour at full IT load, a condition that rarely happens. The <a href="../../data-centers/peak-shaving-tank/index.html">Peak Shaving Tank</a> sizes a chilled-water tank that covers those few hours, so the chillers and their electrical supply can be rated lower. The tank recharges during the night.</p>
<h2>1. Choose the weather</h2>
<p>Pick one of the built-in cities, which load the measured hourly year and the ASHRAE design conditions of the main airport, or upload an EPW or CSV weather file.</p>
<h2>2. Enter the load and plant</h2>
<ul><li><b>Cooling load</b>: the chiller capacity at full IT load.</li>
<li><b>Night IT load</b>: the average IT load over the 12-hour night, 19:00 to 07:00. The lower it is, the faster the tank recharges.</li>
<li><b>Cooling system</b>: air-cooled systems, whose power peaks hardest in the hottest hours.</li>
<li><b>Supply and return</b>: the chilled-water temperatures, which set how much cooling each cubic metre stores.</li></ul>
<h2>3. Set the design temperature</h2>
<p>The tool fills in the recommended design temperature: the lowest one whose tank still recharges safely after the hottest afternoon. Type your own value to test it, or add a margin under the safety settings.</p>
<h2>4. Read the results</h2>
<ul><li><b>Rated power cut</b>: the reduction in the cooling plant's electrical rating, against the plant rated for the extreme.</li>
<li><b>Tank</b>: the volume and the tank size.</li>
<li><b>Recharge time</b> at the night load, and the <b>hours per year</b> the tank works.</li>
<li>The <b>hottest-day chart</b> shows the plant power with and without the tank, and the tank level through the day and night.</li>
<li>A <b>reserve</b> is kept full: it is never used for peak shaving and covers a power changeover or weather hotter than the design.</li>
<li>The <b>typical-year check</b> confirms the tank covers every hour of the measured year.</li></ul>`,
 faq:[[`How much can a chilled-water tank cut the cooling plant rated power?`,`Across the 33 built-in cities, typically 10–17% of the cooling plant rated power for air-cooled chillers, depending on how short and sharp the hottest hours are.`],
  [`Why does recharge time matter?`,`After the hottest afternoon the tank must be full again before the next hot day. If it needs more than about 4 hours at the night load, recharging may not be safe during a heatwave: raise the design temperature or add a standby chiller.`],
  [`Is this the same as a ride-through tank?`,`No. A ride-through tank covers a few minutes of full cooling during a power changeover. A peak shaving tank covers the extreme-weather hours and lets the plant be rated lower. A reserve can be kept full for ride-through.`]]},

{slug:'ride-through-tank-sizing', date:'2026-11-22', tool:['Ride-Through Tank','data-centers/ride-through-tank/'],
 title:'How to size a chilled-water ride-through tank for a data center',
 desc:'How to size a chilled-water tank that keeps a data center cooled while the generators start and the chillers restart: the equation, a worked 20 MW example, recommended ride-through times and what must be on UPS.',
 body:`<p>When the grid fails, the generators start within seconds, but the chillers need minutes to restart and reach full capacity. A chilled-water ride-through tank carries the cooling load through that gap. This article shows how to size it; the free <a href="../../data-centers/ride-through-tank/index.html">Ride-Through Tank</a> tool does the calculation for any load.</p>
<h2>The equation</h2>
<p>The tank stores cooling as the temperature difference between the chilled-water supply and return:</p>
<p class="eq">Volume (m³) = Load (kW) × time (h) × 3,600 / (4,180 × ΔT × η) × (1 + margin)</p>
<ul><li><b>4,180 kJ/m³·K</b>: the heat capacity of water.</li>
<li><b>ΔT</b>: supply / return difference, e.g. 10 K for a 30 / 40 °C loop.</li>
<li><b>η</b>: tank efficiency, about 85% for a well-stratified tank (mixing at the thermocline).</li>
<li><b>Margin</b>: 20% is a reasonable allowance.</li></ul>
<h2>Worked example: 20 MW for 10 minutes</h2>
<p>Cooling to store = 20,000 kW × 10 / 60 h = 3,333 kWh. Net volume = 3,333 × 3,600 / (4,180 × 10 × 0.85) = 338 m³. With a 20% margin: about <b>405 m³</b>.</p>
<h2>How many minutes?</h2>
${table(['Step','Typical time'],[['Generator start and transfer (NFPA 110 Level 1: power within 10 s)','10–30 s'],['Loads restored in stages: pumps first, then chillers','30–60 s'],['Chiller restart to full capacity, quick-restart chillers','3–5 min'],['Chiller restart to full capacity, standard chillers','10–15 min']])}
<p>Design for about <b>10 minutes</b> with quick-restart chillers, <b>15–20 minutes</b> with standard chillers, and <b>15 minutes</b> for Tier IV or liquid cooling with little thermal mass. The margin covers a generator that does not sync at the first attempt or chillers restarted one after another.</p>
<h2>Tank shape</h2>
<p>Stratification works best when the tank is tall: a height of 1 to 4 times the diameter, up to the site height limit (often about 15 m). Larger volumes are split into equal tanks.</p>
<h2>What must be on UPS</h2>
<p>The chilled-water pumps and the CDUs or air handlers must run on UPS, or the tank cannot deliver its cooling. With liquid cooling the racks hold very little heat: even 30–60 seconds without flow can trip the IT, so continuous circulation matters as much as the tank volume.</p>`,
 faq:[[`How big a tank do I need to ride through a chiller restart?`,`For a 20 MW load, 10 minutes, a 10 K supply/return difference and 85% tank efficiency: 3,333 kWh of cooling, 338 m³ net, about 405 m³ with a 20% margin.`],
  [`How many minutes of ride-through should a data center tank give?`,`About 10 minutes with quick-restart chillers (typical data center specification), 15–20 minutes with standard chillers, and 15 minutes for Tier IV or liquid cooling with little thermal mass.`],
  [`What else must be on UPS?`,`The chilled-water pumps and the CDUs or air handlers, or the tank cannot deliver its cooling during the gap.`]]},

{slug:'ashrae-90-4-mlc', date:'2026-11-22', tool:['Cooling Plant Selector','data-centers/cooling-plant/'],
 title:'ASHRAE 90.4 MLC explained, with the limits by climate zone',
 desc:'What the ASHRAE 90.4 mechanical load component (MLC) is, how to calculate it, the maximum annualized MLC for every climate zone from ASHRAE 90.4-2025 Table 6.5, and typical values for real cooling plants.',
 body:`<p>ASHRAE Standard 90.4, the energy standard for data centers, limits how much energy the cooling plant may use per unit of IT energy. That ratio is the <b>mechanical load component (MLC)</b>.</p>
<h2>Definition</h2>
<p class="eq">Annualized MLC = annual mechanical (cooling) energy ÷ annual IT energy</p>
<p>Mechanical energy covers the chiller compressors, heat-rejection fans, pumps and the air handlers or CDUs. An MLC of 0.06 means 0.06 kWh of cooling energy per kWh of IT energy.</p>
<h2>Maximum annualized MLC (ASHRAE 90.4-2025, Table 6.5)</h2>
${table(['Climate zone','ITE > 300 kW','ITE ≤ 300 kW'],[['0A','0.29','0.37'],['0B','0.32','0.41'],['1A','0.30','0.37'],['1B','0.31','0.39'],['2A','0.27','0.35'],['2B','0.20','0.33'],['3A','0.24','0.33'],['3B','0.20','0.33'],['3C','0.17','0.27'],['4A','0.21','0.33'],['4B','0.17','0.29'],['4C','0.17','0.27'],['5A','0.19','0.34'],['5B','0.17','0.30'],['5C','0.17','0.29'],['6A','0.19','0.31'],['6B','0.17','0.31'],['7','0.17','0.31'],['8','0.15','0.32']])}
<p>Climate zones follow ASHRAE Standard 169. Dubai and Riyadh are hot-dry zones (0B and 1B); Mumbai and Singapore are hot-humid (0A).</p>
<h2>Typical values</h2>
<p>For a 20 MW hall with a 30 / 40 °C liquid loop, water-cooled chillers with cooling towers and free cooling reach an annual MLC of about 0.04–0.07 across hot and temperate cities: well under the limits. Air-cooled chillers without free cooling in a hot climate are typically 0.15–0.17. Liquid cooling at warm supply temperatures is what makes low MLC possible: more free-cooling hours and a smaller chiller lift.</p>
<h2>Screening versus compliance</h2>
<p>The <a href="../../data-centers/cooling-plant/index.html">Cooling Plant Selector</a> checks the annual MLC of every option against the limit for the city's climate zone. It is a screening check; a formal compliance calculation follows the 90.4 procedure for load points and weather data.</p>`},

{slug:'cooling-towers-vs-adiabatic-vs-dry-coolers', date:'2026-11-22', tool:['Cooling Plant Selector','data-centers/cooling-plant/'],
 title:'Cooling towers vs adiabatic coolers vs dry coolers for data centers in hot climates',
 desc:'How cooling towers, adiabatic coolers, dry coolers and hybrid plants compare for data centers in hot climates: approaches, free cooling, electrical peak, energy, water and carbon, with a 100 MW Dubai example.',
 body:`<p>The heat-rejection equipment sets the condenser water temperature, and with it the chiller efficiency, the free-cooling hours and the electrical peak. In hot climates the choice is mainly between energy and water.</p>
<h2>How close each one gets</h2>
${table(['Equipment','Water out at the ASHRAE 90.1-2025 rating point','Depends on'],[['Cooling towers','wet-bulb + 5.56 K','wet-bulb'],['Adiabatic coolers (pads on)','wet-bulb + 11.1 K','wet-bulb, pads above about 24 °C'],['Dry coolers','dry-bulb + 5.56 K','dry-bulb'],['Hybrid (dry coolers then towers in series)','dry coolers alone in cool weather, towers above','both']])}
<p>A cooling tower cools water by evaporation, so it can reach close to the wet-bulb, which in a hot desert is 15–20 K below the dry-bulb. That is why towers give the lowest condenser water, the smallest chiller lift and the most free-cooling hours.</p>
<h2>Example: 100 MW in Dubai, 100% load all year</h2>
${table(['System','Design peak (MW)','Electricity (GWh/yr)','Water (m³/yr)','Carbon (t CO₂e/yr)'],[
 ['Cooling towers + free cooling','14.2','72.7','1,629,980','37,142'],
 ['Hybrid dry coolers + towers','14.2','77.9','1,138,317','38,784'],
 ['Adiabatic coolers','20.3','113.4','747,562','54,724'],
 ['Air-cooled chillers + dry coolers','29.8','127.9','0','60,492'],
 ['Air-cooled chillers','29.8','150.2','0','70,920']])}
<ul><li><b>Towers</b> win on energy, peak and carbon, but use the most water: in the Gulf that water is desalinated, which adds its own energy and carbon.</li>
<li><b>Hybrid</b> keeps the tower peak and saves about 30% of the water in Dubai, more in milder climates.</li>
<li><b>Adiabatic coolers</b> use less than half the water of towers, but their condenser water runs about 5.5 K warmer; on the most humid Gulf hours it can pass 43 °C, above the standard chiller range.</li>
<li><b>Dry coolers</b> need no water, but in Dubai they free-cool only in the cooler months and the air-cooled chillers set a high peak.</li></ul>
<h2>Humidity matters more than heat</h2>
<p>Towers and adiabatic coolers follow the wet-bulb. A humid city such as Mumbai, though cooler than Dubai, gets fewer free-cooling hours because its wet-bulb stays high all year. Compare any city in the <a href="../../data-centers/cooling-plant/index.html">Cooling Plant Selector</a>.</p>`},

{slug:'gb300-nvl72-liquid-cooling', date:'2026-11-22', tool:['Liquid Rack Cooling','data-centers/rack-cooling/'],
 title:'NVIDIA GB300 NVL72 liquid cooling: coolant flow, supply temperature and minimum flow',
 desc:'What an NVIDIA GB300 NVL72 rack needs from the liquid cooling system: about 135 kW, 90% to liquid, 25–45 °C supply, 59–177 L/min of coolant, the safe minimum flow and why the CDU response matters.',
 body:`<p>The NVIDIA GB300 NVL72 is a rack-scale system of 72 GPUs cooled directly by liquid. Designing the facility water and the CDU loop starts from what one rack needs.</p>
<h2>Key figures per rack</h2>
${table(['Item','Value'],[['Thermal design power','135 kW, up to about 155 kW peak'],['Heat to liquid','about 90%; the rest to air'],['Coolant supply temperature','25–45 °C (ASHRAE W45 class)'],['Coolant flow','about 59 L/min at 25 °C supply up to 177 L/min at 45 °C supply'],['Coolant return','held at about 55 °C']])}
<p>Source: <a href="https://lenovopress.lenovo.com/lp2357-lenovo-nvidia-gb300-nvl72-rack-scale-ai" rel="noopener">Lenovo GB300 NVL72 product guide</a>.</p>
<h2>Why the flow rises with supply temperature</h2>
<p>The required flow follows the heat balance: flow = heat to liquid ÷ (density × specific heat × (maximum return − supply)). With the return held near 55 °C, a 45 °C supply leaves only a 10 K rise, so the flow is three times that at 25 °C. A warmer supply saves energy at the plant (more free cooling, lower chiller lift) at the cost of more pumping.</p>
<h2>Minimum flow and the CDU response</h2>
<p>Variable-flow control saves pump energy at idle, but the racks hold very little coolant. If the load jumps from idle to full power, the coolant heats up until the CDU pump ramps up and its control valve opens. The safe minimum flow is the lowest idle flow from which that jump does not push the return past its limit, and never below the vendor minimum. A small buffer tank on the CDU loop can cover the response gap; beyond that, a bigger tank only lowers the supply temperature rise.</p>
<h2>Pump trip</h2>
<p>If the CDU pump stops, the coolant reaches its limit within seconds. Run the standby CDU pump in parallel with automatic changeover, and keep the CDUs and facility pumps on UPS.</p>
<p>The <a href="../../data-centers/rack-cooling/index.html">Liquid Rack Cooling</a> tool calculates the flow, safe minimum flow, minimum buffer tank and pump-trip time for the GB300 NVL72 and other GPU and CPU platforms.</p>`,
 faq:[[`What coolant flow does an NVIDIA GB300 NVL72 rack need?`,`About 59 L/min at 25 °C supply up to 177 L/min at 45 °C supply, holding the return at about 55 °C (Lenovo GB300 NVL72 data), plus the operating margin.`],
  [`What is the safe minimum flow at idle?`,`The lowest idle flow from which a jump to rated power does not push the coolant return past its limit before the VFD pump ramps up; never below the vendor minimum flow.`],
  [`Do I need a buffer tank on the CDU loop?`,`Only if the water in the CDU and its pipes cannot cover the time the control valve and pump take to respond. Beyond that minimum, a bigger tank only lowers the supply temperature rise.`],
  [`What happens if the CDU pump trips?`,`The racks hold very little heat: the coolant reaches its limit within seconds, so the standby CDU pump should run in parallel with automatic changeover.`]]},
];

const head=(title,desc,url,ld,root)=>`<!DOCTYPE html>
<html lang="en">
<head>
${GA}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Othman Energy Lab</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="${root}shared/img/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}shared/img/apple-touch-icon.png">
<meta name="theme-color" content="#a8326e">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Othman Energy Lab">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://www.oenergylab.com/shared/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="canonical" href="${url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${root}shared/css/base.css">
<style>
.art{max-width:76ch;padding:36px 0 24px}
.art h1{font-size:clamp(26px,3.4vw,38px);line-height:1.15;letter-spacing:-.02em;margin:6px 0 10px}
.art .meta{font-size:13px;color:var(--muted);margin:0 0 22px}
.art h2{font-size:21px;margin:28px 0 8px}
.art p,.art li{font-size:16px;line-height:1.65;color:var(--text2)}
.art ul{padding-left:20px}
.art .eq{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14.5px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text)}
.art .tw{overflow-x:auto;margin:10px 0}
.art table{border-collapse:collapse;width:100%;font-size:14px}
.art th,.art td{border-bottom:1px solid var(--border);padding:7px 8px;text-align:left;vertical-align:top}
.art th{background:var(--surface)}
.art .cta{margin:28px 0 8px}
.art a:not(.btn),.alist a{color:var(--brand-ink)}
.art a:not(.btn):hover{text-decoration-thickness:2px}
.alist{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:8px 0 40px}
.artpic{margin:18px 0 8px;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.alist .acard2{padding:0;overflow:hidden;display:flex;flex-direction:column}.alist .acard2 .ab{padding:16px 20px 20px}
.alist a.acard2:hover{transform:translateY(-3px);border-color:var(--brand)}
.alist .card{text-decoration:none;display:block}
.alist h2{font-size:19px;margin:0 0 6px;color:var(--text)}
.alist p{margin:0;color:var(--text2);font-size:14.5px;line-height:1.55}
</style>
<meta name="author" content="Mutaz Othman">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':ld})}</script>
</head>`;

// ---------- pictures: one per article, shown on the cards and at the top of the article ----------
const HOME=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const toolArt=href=>{ const i=HOME.indexOf('href="'+href+'index.html"'); if(i<0) return ''; const a=HOME.indexOf('<svg',i), b=HOME.indexOf('</svg>',a)+6; return HOME.slice(a,b); };
const win=(title,inner)=>`<svg viewBox="0 0 400 210"><rect class="tbg" width="400" height="210"/><rect class="win" x="18" y="16" width="364" height="178" rx="10"/><circle class="dot" cx="34" cy="31" r="3.5"/><circle class="dot" cx="46" cy="31" r="3.5"/><circle class="dot" cx="58" cy="31" r="3.5"/><path class="sep" d="M18 44H382"/><text class="tt" x="34" y="64">${title}</text>${inner}</svg>`;
const ART={
 'ashrae-90-4-mlc':()=>win('Annual MLC against the limit',
   '<rect class="lab" x="34" y="92" width="330" height="16" rx="8"/><rect class="pt" x="34" y="92" width="150" height="16" rx="8"/>'
  +'<path d="M262 80V122" style="stroke:var(--brand);stroke-width:2.5;stroke-dasharray:5 4"/><text class="tt" x="268" y="84" style="fill:var(--brand-ink)">90.4 max</text>'
  +'<path d="M184 116l-7 12h14z" style="fill:var(--text)"/><text class="tt" x="166" y="146">design</text>'
  +'<rect class="lab" x="34" y="160" width="60" height="10" rx="5"/><rect class="lab" x="104" y="160" width="40" height="10" rx="5"/>'),
 'cooling-towers-vs-adiabatic-vs-dry-coolers':()=>win('Heat rejection',
   // cooling tower
   '<path d="M50 172L62 92H118L130 172Z" style="fill:var(--bg);stroke:var(--text2);stroke-width:1.5"/><ellipse cx="90" cy="92" rx="24" ry="5" style="fill:var(--surface);stroke:var(--text2);stroke-width:1.5"/>'
  +'<path class="drift" d="M80 82c-4-6 4-9 0-15M100 82c-4-6 4-9 0-15" style="fill:none;stroke:var(--s1);stroke-width:2;stroke-linecap:round;opacity:.7"/>'
   // adiabatic
  +'<rect x="160" y="100" width="80" height="72" rx="6" style="fill:var(--surface);stroke:var(--text2);stroke-width:1.5"/><path d="M168 112v52M178 112v52M222 112v52M232 112v52" style="stroke:var(--s1);stroke-width:3;opacity:.55"/>'
  +'<circle cx="200" cy="124" r="13" style="fill:var(--bg);stroke:var(--text2);stroke-width:1.5"/><path d="M200 112v24M188 124h24" style="stroke:var(--text2);stroke-width:2"/>'
   // dry cooler
  +'<rect x="270" y="108" width="92" height="50" rx="6" style="fill:var(--surface);stroke:var(--text2);stroke-width:1.5"/><circle cx="294" cy="133" r="15" style="fill:var(--bg);stroke:var(--text2);stroke-width:1.5"/><circle cx="338" cy="133" r="15" style="fill:var(--bg);stroke:var(--text2);stroke-width:1.5"/>'
  +'<path d="M294 120v26M281 133h26M338 120v26M325 133h26" style="stroke:var(--text2);stroke-width:2"/><path d="M280 158v14M352 158v14" style="stroke:var(--text2);stroke-width:2.5"/>'),
};
const TOOL_ART={'how-to-use-cooling-plant-selector':'data-centers/cooling-plant/','how-to-use-low-carbon-cooling-selector':'data-centers/low-carbon-cooling/','how-to-use-peak-shaving-tank':'data-centers/peak-shaving-tank/','ride-through-tank-sizing':'data-centers/ride-through-tank/','gb300-nvl72-liquid-cooling':'data-centers/rack-cooling/'};
const pic=a=>ART[a.slug]?ART[a.slug]():toolArt(TOOL_ART[a.slug]||'');
const crumbs=list=>({'@type':'BreadcrumbList',itemListElement:list.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:B+url}))});

for(const a of ARTICLES){
  const url=`${B}articles/${a.slug}/`, root='../../';
  const ld=[{'@type':'TechArticle',headline:a.title,description:a.desc,url,mainEntityOfPage:url,datePublished:a.date,dateModified:a.date,inLanguage:'en',
    author:PERSON,publisher:ORG,image:B+'shared/img/og-image.png',about:{'@type':'WebApplication',name:a.tool[0],url:B+a.tool[1]}},
    crumbs([['Home',''],['Articles','articles/'],[a.title,`articles/${a.slug}/`]])];
  if(a.faq) ld.push({'@type':'FAQPage',mainEntity:a.faq.map(([q,ans])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:ans.replace(/<[^>]+>/g,'')}}))});
  const faqHtml=a.faq?`<h2>Frequently asked questions</h2>\n${a.faq.map(([q,ans])=>`<h3>${q}</h3>\n<p>${ans}</p>`).join('\n')}\n`:'';
  const html=`${head(a.title,a.desc,url,ld,root)}
<body>
<header class="sitebar" data-root="${root}" data-page="articles"></header>
<main class="wrap">
<article class="art">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}index.html">Home</a> / <a href="../index.html">Articles</a></nav>
  <h1>${a.title}</h1>
  <p class="meta">By <a href="${root}about/index.html#founder">Eng. Mutaz Othman</a> · ${new Date(a.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
  <figure class="thumb artpic" aria-hidden="true">${pic(a)}</figure>
${a.body}
${faqHtml}  <p class="cta"><a class="btn primary" href="${root}${a.tool[1]}index.html">Open the ${a.tool[0]} →</a></p>
</article>
</main>
<footer class="sitefoot" data-root="${root}"></footer>
<script src="${root}shared/js/site.js"></script>
</body>
</html>
`;
  fs.mkdirSync(path.join(ROOT,'articles',a.slug),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'articles',a.slug,'index.html'),html);
}
// index of articles
{
  const url=B+'articles/', root='../', title='Articles', desc='Practical guides on data center cooling: choosing the cooling plant, ride-through tanks, ASHRAE 90.4 MLC, cooling towers vs adiabatic vs dry coolers, and liquid-cooled GPU racks. By Eng. Mutaz Othman.';
  const ld=[{'@type':'CollectionPage',name:'Articles',url,description:desc,publisher:ORG,author:PERSON,hasPart:ARTICLES.map(a=>({'@type':'TechArticle',headline:a.title,url:`${B}articles/${a.slug}/`}))},crumbs([['Home',''],['Articles','articles/']])];
  const html=`${head(title+': data center cooling guides',desc,url,ld,root)}
<body>
<header class="sitebar" data-root="${root}" data-page="articles"></header>
<main class="wrap">
<div class="art" style="padding-bottom:8px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}index.html">Home</a> / Articles</nav>
  <h1>Articles</h1>
  <p>Practical, code-based guides on data center cooling, each linked to a free tool. By <a href="${root}about/index.html#founder">Eng. Mutaz Othman</a>.</p>
</div>
<div class="alist">
${ARTICLES.map(a=>`  <a class="card acard2" href="${a.slug}/index.html"><div class="thumb" aria-hidden="true">${pic(a)}</div><div class="ab"><h2>${a.title}</h2><p>${esc(a.desc)}</p></div></a>`).join('\n')}
</div>
</main>
<footer class="sitefoot" data-root="${root}"></footer>
<script src="${root}shared/js/site.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT,'articles','index.html'),html);
}
// home page articles: refresh the cards between the markers
{ const f=path.join(ROOT,'index.html'); let h=fs.readFileSync(f,'utf8');
  const cards=ARTICLES.map(a=>`
      <a class="card acard" href="articles/${a.slug}/index.html"><div class="thumb" aria-hidden="true">${pic(a)}</div><span class="atag">${a.tool[0]}</span><h3>${a.title}</h3><p>${esc(a.desc)}</p><span class="open">Read article →</span></a>`).join('')+'\n    ';
  h=h.replace(/<div class="agrid">[\s\S]*?(?:<\/div>)+\n    <a class="allart"/,`<div class="agrid">${cards}</div></div>\n    <a class="allart"`);
  fs.writeFileSync(f,h); }
module.exports=ARTICLES;
if(require.main===module) console.log(`articles: ${ARTICLES.length} + index`);
