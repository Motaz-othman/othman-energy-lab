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
 body:`<p>The <a href="../../data-centers/cooling-plant/index.html">Cooling Plant Selector</a> compares five cooling plants for a data hall with a liquid cooling loop and an air cooling loop, hour by hour over a full weather year, and recommends the right one for the site. This guide walks through the inputs and how to read the results.</p>
<h2>1. Choose the weather</h2>
<p>Pick one of the 33 built-in data center cities in the <b>City</b> tab: Gulf cities (Dubai, Abu Dhabi, Riyadh, Jeddah, Dammam, Manama), major US markets (Northern Virginia, Dallas, Phoenix, Atlanta, Columbus, Silicon Valley, Hillsboro, Reno and others), Europe and Asia-Pacific. Each city loads its airport station's measured typical year (TMYx 2011–2025, 8,760 hours) and its ASHRAE 2025 design conditions. For another site, use the <b>Weather file</b> tab to upload an EPW file or a CSV with hourly dry-bulb and humidity; a sample CSV shows the format.</p>
<h2>2. Enter the data hall load</h2>
<ul><li><b>Cooling load (MW)</b>: the IT load at full output.</li>
<li><b>Frequent load (%)</b>: the load the hall runs at most of the time; annual energy, water and cost use it. Peaks always use 100%.</li>
<li><b>Liquid cooling loop</b>: its share of the load and its supply / return temperatures (default 30 / 40 °C for direct-to-chip cooling).</li>
<li><b>Air cooling loop</b>: supply / return for the fan wall units (default 20 / 30 °C).</li></ul>
<h2>3. Set the site conditions</h2>
<p><b>Water availability</b> can be Available, Limited (water counts double in the ranking) or None (systems that need water are excluded). The <b>design dry-bulb and wet-bulb</b> are blank by default: the tool then checks two coincident design cases from the ASHRAE extremes, Case A with the extreme dry-bulb and Case B with the extreme wet-bulb. Enter a stricter value, such as an ASHRAE 20-year return period, to replace the extreme.</p>
<h2>4. Adjust the engineering inputs (optional)</h2>
<p>The collapsed sections hold the full basis, all with standard defaults you can override: utility tariffs; chillers (ASHRAE 90.1-2025 Path B COP, unit sizes, the condenser-water warning limit); heat rejection (ASHRAE approaches, fan power); pump heads and fan wall units; environmental impact (grid emission factor, refrigerant); electrical losses; and initial cost rates.</p>
<h2>5. Read the results</h2>
<p>The top of the results shows the two design cases and one card per system, the recommended one first: electricity, annual PUE, electrical peak, water, carbon, running and initial cost, with notes on free-cooling hours, savings against air-cooled chillers and the ASHRAE 90.4 MLC check. The tabs go deeper:</p>
<ul><li><b>Overview</b>: all options side by side and the design-day check at both cases, with the number of chillers.</li>
<li><b>Systems</b>: the schematic of each plant with every pump, its equipment, operating modes and monthly free-cooling hours.</li>
<li><b>Energy &amp; water</b>: MLC against ASHRAE 90.4-2025, carbon by source, and electricity and water by component.</li>
<li><b>Cost</b>: running cost, payback against air-cooled chillers, and the initial cost range.</li>
<li><b>Climate</b> and <b>Method</b>: free-cooling potential by month, and every equation and source.</li></ul>
<h2>6. Export the report</h2>
<p><b>PDF report</b> opens a print-ready A4 report (save it with the browser's Save as PDF). <b>Excel tables</b> downloads every results table as a workbook.</p>
<h2>Example: a 100 MW data center in Dubai</h2>
<p>At 100% load all year, with 80 MW on the liquid loop and 20 MW on the air loop:</p>
${table(['System','Design peak (MW)','Electricity (GWh/yr)','Water (m³/yr)','Carbon (t CO₂e/yr)'],[
 ['Water-cooled chillers + cooling towers + free cooling','14.2','72.7','1,629,980','37,142'],
 ['Hybrid dry coolers and towers + free cooling','14.2','77.9','1,138,317','38,784'],
 ['Adiabatic coolers + free cooling','20.3','113.4','747,562','54,724'],
 ['Air-cooled chillers + dry coolers','29.8','127.9','0','60,492'],
 ['Air-cooled chillers','29.8','150.2','0','70,920']])}
<p>Cooling towers rank first: half the electrical peak of air-cooled chillers and about half the carbon, at the cost of the most water. Where water is limited, the hybrid plant saves about 30% of the water for 7% more electricity.</p>`},

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
<p>The chilled-water pumps and the CDUs or air handlers must run on UPS, or the tank cannot deliver its cooling. With liquid cooling the racks hold very little heat: even 30–60 seconds without flow can trip the IT, so continuous circulation matters as much as the tank volume.</p>`},

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
<p>The <a href="../../data-centers/rack-cooling/index.html">Liquid Rack Cooling</a> tool calculates the flow, safe minimum flow, minimum buffer tank and pump-trip time for the GB300 NVL72 and other GPU and CPU platforms.</p>`},
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
<meta name="theme-color" content="#0e7c57">
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
.alist{display:grid;gap:14px;padding:8px 0 40px;max-width:80ch}
.alist .card{padding:18px 22px;text-decoration:none;display:block}
.alist h2{font-size:19px;margin:0 0 6px;color:var(--text)}
.alist p{margin:0;color:var(--text2);font-size:14.5px;line-height:1.55}
</style>
<meta name="author" content="Mutaz Othman">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':ld})}</script>
</head>`;
const crumbs=list=>({'@type':'BreadcrumbList',itemListElement:list.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:B+url}))});

for(const a of ARTICLES){
  const url=`${B}articles/${a.slug}/`, root='../../';
  const ld=[{'@type':'TechArticle',headline:a.title,description:a.desc,url,mainEntityOfPage:url,datePublished:a.date,dateModified:a.date,inLanguage:'en',
    author:PERSON,publisher:ORG,image:B+'shared/img/og-image.png',about:{'@type':'WebApplication',name:a.tool[0],url:B+a.tool[1]}},
    crumbs([['Home',''],['Articles','articles/'],[a.title,`articles/${a.slug}/`]])];
  const html=`${head(a.title,a.desc,url,ld,root)}
<body>
<header class="sitebar" data-root="${root}" data-page="articles"></header>
<main class="wrap">
<article class="art">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}index.html">Home</a> / <a href="../index.html">Articles</a></nav>
  <h1>${a.title}</h1>
  <p class="meta">By <a href="${root}about/index.html#founder">Eng. Mutaz Othman</a> · ${new Date(a.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
${a.body}
  <p class="cta"><a class="btn primary" href="${root}${a.tool[1]}index.html">Open the ${a.tool[0]} →</a></p>
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
${ARTICLES.map(a=>`  <a class="card" href="${a.slug}/index.html"><h2>${a.title}</h2><p>${esc(a.desc)}</p></a>`).join('\n')}
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
      <a class="card acard" href="articles/${a.slug}/index.html"><span class="atag">${a.tool[0]}</span><h3>${a.title}</h3><p>${esc(a.desc)}</p><span class="open">Read article →</span></a>`).join('')+'\n    ';
  h=h.replace(/<div class="agrid">[\s\S]*?(?:<\/div>)+\n    <a class="allart"/,`<div class="agrid">${cards}</div></div>\n    <a class="allart"`);
  fs.writeFileSync(f,h); }
module.exports=ARTICLES;
if(require.main===module) console.log(`articles: ${ARTICLES.length} + index`);
